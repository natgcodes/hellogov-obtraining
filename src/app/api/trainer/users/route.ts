import { randomInt } from "crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { HELLOGOV_PROGRAM_ID } from "@/lib/constants/program";

type UserRole = "learner" | "trainer" | "observer" | "cross_training" | "team_leader";

type CreateUserBody = {
  fullName?: string;
  email?: string;
  role?: UserRole;
  teamLead?: string | null;
};

type UpdateUserBody = {
  userId?: string;
  fullName?: string;
  email?: string;
  role?: UserRole;
  teamLead?: string | null;
};

type DeleteUserBody = {
  userId?: string;
};

// ===========================================================
// HELPERS
// ===========================================================

function isAllowedCompanyEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateTemporaryPassword() {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%";

  const allCharacters =
    uppercase + lowercase + numbers + symbols;

  function randomCharacter(characters: string) {
    return characters[randomInt(characters.length)];
  }

  const characters = [
    randomCharacter(uppercase),
    randomCharacter(lowercase),
    randomCharacter(numbers),
    randomCharacter(symbols),
  ];

  while (characters.length < 14) {
    characters.push(randomCharacter(allCharacters));
  }

  // Secure Fisher-Yates shuffle
  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);

    [characters[i], characters[j]] = [
      characters[j],
      characters[i],
    ];
  }

  return characters.join("");
}

async function getAuthorizedTrainer() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      error: NextResponse.json(
        {
          error: "You must be signed in.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: trainerProfile,
    error: trainerProfileError,
  } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .single();

  if (
    trainerProfileError ||
    (trainerProfile?.role !== "trainer" ||
    trainerProfile?.account_status !== "active")
  ) {
    return {
      supabase,
      user: null,
      error: NextResponse.json(
        {
          error:
            "You do not have permission to manage users.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    supabase,
    user,
    error: null,
  };
}

// ===========================================================
// CREATE USER
// ===========================================================

export async function POST(request: Request) {
  try {
    const auth = await getAuthorizedTrainer();

    if (auth.error || !auth.user) {
      return auth.error;
    }

    const body =
      (await request.json()) as CreateUserBody;

    const fullName = body.fullName?.trim();

    const email = body.email
      ?.trim()
      .toLowerCase();

    const role = body.role;

    const teamLead =
      body.teamLead?.trim() || null;

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!fullName) {
      return NextResponse.json(
        {
          error: "Full name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isAllowedCompanyEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !["learner", "trainer", "observer", "cross_training", "team_leader"].includes(role ?? "")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid account role.",
        },
        {
          status: 400,
        }
      );
    }

    const admin = createAdminClient();

    // -------------------------------------------------------
    // TEMPORARY PASSWORD
    //
    // No invitation email is sent.
    // The password is returned only in this response.
    // -------------------------------------------------------

    const temporaryPassword =
      generateTemporaryPassword();

    // -------------------------------------------------------
    // CREATE AUTH USER
    // -------------------------------------------------------

    const {
      data: createData,
      error: createError,
    } =
      await admin.auth.admin.createUser({
        email,
        password: temporaryPassword,

        // We intentionally confirm the email here because
        // trainees will not receive a confirmation email.
        email_confirm: true,

        user_metadata: {
          full_name: fullName,
          role,
        },
      });

    if (createError) {
      console.error(
        "Unable to create Auth user:",
        createError
      );

      const errorMessage =
        createError.message.toLowerCase();

      const duplicateUser =
        errorMessage.includes("already") ||
        errorMessage.includes("registered") ||
        errorMessage.includes("exists");

      return NextResponse.json(
        {
          error: duplicateUser
            ? "An account with this email already exists."
            : "We couldn't create this account. Please try again.",
        },
        {
          status: duplicateUser
            ? 409
            : 500,
        }
      );
    }

    const createdUser = createData.user;

    if (!createdUser) {
      return NextResponse.json(
        {
          error:
            "The account could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    // -------------------------------------------------------
    // CREATE LEARNING CENTER PROFILE
    // -------------------------------------------------------

    const { error: profileError } =
      await admin
        .from("profiles")
        .upsert(
          {
            id: createdUser.id,
            full_name: fullName,
            email,
            role,
            team_lead:
              role !== "trainer"
                ? teamLead
                : null,
          },
          {
            onConflict: "id",
          }
        );

    if (profileError) {
      console.error(
        "Unable to create user profile:",
        profileError
      );

      // Auth user exists but profile creation failed.
      // Delete the Auth user so we don't leave a
      // partially-created account behind.
      const { error: rollbackError } =
        await admin.auth.admin.deleteUser(
          createdUser.id
        );

      if (rollbackError) {
        console.error(
          "Unable to rollback Auth user:",
          rollbackError
        );
      }

      return NextResponse.json(
        {
          error:
            "The account was created but its profile could not be configured.",
        },
        {
          status: 500,
        }
      );
    }

    // -------------------------------------------------------
// AUTOMATIC LEARNER ENROLLMENT
// -------------------------------------------------------

if (role !== "trainer") {
  const { error: enrollmentError } = await admin
    .from("program_enrollments")
    .upsert(
      {
        program_id: HELLOGOV_PROGRAM_ID,
        learner_id: createdUser.id,
        status: "not_started",
      },
      {
        onConflict: "program_id,learner_id",
        ignoreDuplicates: true,
      }
    );

  if (enrollmentError) {
    console.error(
      "Unable to enroll new learner:",
      enrollmentError
    );

    // Roll back the new account to avoid leaving
    // a learner without a program enrollment.
    const { error: rollbackError } =
      await admin.auth.admin.deleteUser(createdUser.id);

    if (rollbackError) {
      console.error(
        "Unable to rollback learner creation:",
        rollbackError
      );
    }

    return NextResponse.json(
      {
        error:
          "The account could not be enrolled in the onboarding program.",
      },
      {
        status: 500,
      }
    );
  }
}


    // -------------------------------------------------------
    // SUCCESS
    //
    // IMPORTANT:
    // temporaryPassword is returned only now.
    // We do not store the plain-text password ourselves.
    // -------------------------------------------------------

    return NextResponse.json(
      {
        user: {
          id: createdUser.id,
          fullName,
          email,
          role,
          teamLead:
            role !== "trainer"
              ? teamLead
              : null,
        },
        temporaryPassword,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Unexpected create-user error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the account.",
      },
      {
        status: 500,
      }
    );
  }
}

// ===========================================================
// UPDATE USER
// ===========================================================

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthorizedTrainer();

    if (auth.error || !auth.user) {
      return auth.error;
    }

    const body =
      (await request.json()) as UpdateUserBody;

    const userId = body.userId?.trim();

    const fullName = body.fullName?.trim();

    const email = body.email
      ?.trim()
      .toLowerCase();

    const role = body.role;

    const teamLead =
      body.teamLead?.trim() || null;

    if (!userId) {
      return NextResponse.json(
        {
          error: "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        {
          error: "Full name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isAllowedCompanyEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !["learner", "trainer", "observer", "cross_training", "team_leader"].includes(role ?? "")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid account role.",
        },
        {
          status: 400,
        }
      );
    }

    // The currently authenticated trainer cannot remove
    // their own trainer permissions.
    if (
      userId === auth.user.id &&
      role !== "trainer"
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot change your own role from Trainer to Trainee.",
        },
        {
          status: 400,
        }
      );
    }

    const admin = createAdminClient();

    // -------------------------------------------------------
    // VERIFY TARGET USER
    // -------------------------------------------------------

    const {
      data: existingProfile,
      error: existingProfileError,
    } = await admin
      .from("profiles")
      .select(
        "id, full_name, email, role, team_lead"
      )
      .eq("id", userId)
      .single();

    if (
      existingProfileError ||
      !existingProfile
    ) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (existingProfile.role === "trainer" && role !== "trainer") {
      const { count, error: countError } = await admin.from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "trainer").eq("account_status", "active");
      if (countError || (count ?? 0) <= 1) return NextResponse.json(
        { error: "At least one active Trainer must remain." }, { status: 400 });
    }

    // -------------------------------------------------------
    // UPDATE AUTH
    // -------------------------------------------------------

    const {
      data: updatedAuthData,
      error: authUpdateError,
    } =
      await admin.auth.admin.updateUserById(
        userId,
        {
          email,
          user_metadata: {
            full_name: fullName,
            role,
          },
        }
      );

    if (
      authUpdateError ||
      !updatedAuthData.user
    ) {
      console.error(
        "Unable to update Auth user:",
        authUpdateError
      );

      const duplicateEmail =
        authUpdateError?.message
          ?.toLowerCase()
          .includes("already") ||
        authUpdateError?.message
          ?.toLowerCase()
          .includes("registered");

      return NextResponse.json(
        {
          error: duplicateEmail
            ? "Another account is already using this email address."
            : "We couldn't update the account login information.",
        },
        {
          status: duplicateEmail
            ? 409
            : 500,
        }
      );
    }

    // -------------------------------------------------------
    // UPDATE PROFILE
    // -------------------------------------------------------

    const { error: profileUpdateError } =
      await admin
        .from("profiles")
        .update({
          full_name: fullName,
          email,
          role,
          team_lead:
            role !== "trainer"
              ? teamLead
              : null,
        })
        .eq("id", userId);

    if (profileUpdateError) {
      console.error(
        "Unable to update user profile:",
        profileUpdateError
      );

      // Auth has already changed.
      // Attempt to restore the previous values.
      const { error: rollbackError } =
        await admin.auth.admin.updateUserById(
          userId,
          {
            email:
              existingProfile.email ??
              undefined,
            user_metadata: {
              full_name:
                existingProfile.full_name,
              role: existingProfile.role,
            },
          }
        );

      if (rollbackError) {
        console.error(
          "Unable to rollback Auth update:",
          rollbackError
        );
      }

      return NextResponse.json(
        {
          error:
            "The login information was updated, but the Learning Center profile could not be saved.",
        },
        {
          status: 500,
        }
      );
    }

// -------------------------------------------------------
// ENROLL USER WHEN CHANGING TO LEARNER
// -------------------------------------------------------

if (role !== "trainer") {
  const { error: enrollmentError } = await admin
    .from("program_enrollments")
    .upsert(
      {
        program_id: HELLOGOV_PROGRAM_ID,
        learner_id: userId,
        status: "not_started",
      },
      {
        onConflict: "program_id,learner_id",
        ignoreDuplicates: true,
      }
    );

  if (enrollmentError) {
    console.error(
      "Unable to enroll learner after role update:",
      enrollmentError
    );

    return NextResponse.json(
      {
        error:
          "The user profile was updated, but enrollment in the onboarding program failed.",
      },
      {
        status: 500,
      }
    );
  }
}


    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        fullName,
        email,
        role,
        teamLead:
          role !== "trainer"
            ? teamLead
            : null,
      },
    });
  } catch (error) {
    console.error(
      "Unexpected update-user error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating the account.",
      },
      {
        status: 500,
      }
    );
  }
}

// ===========================================================
// DELETE USER
// ===========================================================

export async function DELETE() {
  return NextResponse.json(
    { error: "Permanent deletion is disabled. Deactivate the account instead to preserve training records." },
    { status: 405 }
  );
}
