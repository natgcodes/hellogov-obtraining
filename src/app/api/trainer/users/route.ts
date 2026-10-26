import { randomInt } from "crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type UserRole =
  | "learner"
  | "trainer"
  | "observer"
  | "cross_training"
  | "team_leader"
  | "executive";

type CreateUserBody = {
  fullName?: string;
  email?: string;
  role?: UserRole;
  teamLead?: string | null;
  programId?: string | null;
};

type UpdateUserBody = {
  userId?: string;
  fullName?: string;
  email?: string;
  role?: UserRole;
  teamLead?: string | null;
};

// ===========================================================
// HELPERS
// ===========================================================

const ALLOWED_ROLES: UserRole[] = [
  "learner",
  "trainer",
  "observer",
  "cross_training",
  "team_leader",
  "executive",
];

function isAllowedCompanyEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedRole(role: unknown): role is UserRole {
  return (
    typeof role === "string" &&
    ALLOWED_ROLES.includes(role as UserRole)
  );
}

function getTeamLead(
  role: UserRole,
  teamLead: string | null
) {
  if (
    role === "trainer" ||
    role === "executive"
  ) {
    return null;
  }

  return teamLead;
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

// ===========================================================
// TRAINER AUTHORIZATION
// ===========================================================

async function getAuthorizedTrainer() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
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
    trainerProfile?.role !== "trainer" ||
    trainerProfile?.account_status !== "active"
  ) {
    return {
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
    user,
    error: null,
  };
}

// ===========================================================
// GET AVAILABLE TRAINING WAVES
// ===========================================================

export async function GET() {
  try {
    const auth = await getAuthorizedTrainer();

    if (auth.error || !auth.user) {
      return auth.error;
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("programs")
      .select("id, title, status")
      .order("title", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Unable to load training waves:",
        error
      );

      return NextResponse.json(
        {
          error: "Unable to load training waves.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      waves: data ?? [],
    });
  } catch (error) {
    console.error(
      "Unexpected training wave loading error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to load training waves.",
      },
      {
        status: 500,
      }
    );
  }
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

    const programId =
      typeof body.programId === "string"
        ? body.programId.trim() || null
        : null;

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

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        {
          error: "Invalid account role.",
        },
        {
          status: 400,
        }
      );
    }

    const admin = createAdminClient();

    // -------------------------------------------------------
    // VALIDATE ASSIGNED WAVE
    // -------------------------------------------------------

    if (role !== "trainer") {
      if (!programId) {
        return NextResponse.json(
          {
            error: "An assigned wave is required.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: selectedProgram,
        error: programError,
      } = await admin
        .from("programs")
        .select("id")
        .eq("id", programId)
        .maybeSingle();

      if (programError || !selectedProgram) {
        return NextResponse.json(
          {
            error:
              "The selected training wave does not exist.",
          },
          {
            status: 400,
          }
        );
      }
    }

    // -------------------------------------------------------
    // TEMPORARY PASSWORD
    // -------------------------------------------------------

    const temporaryPassword =
      generateTemporaryPassword();

    // -------------------------------------------------------
    // CREATE AUTH USER
    // -------------------------------------------------------

    const {
      data: createData,
      error: createError,
    } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,

      // No confirmation email is required.
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
          status: duplicateUser ? 409 : 500,
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

            team_lead: getTeamLead(
              role,
              teamLead
            ),

            active_program_id:
              role === "trainer"
                ? null
                : programId,
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

      // Roll back the Auth account if profile setup fails.
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
    // AUTOMATIC PROGRAM ENROLLMENT
    //
    // All learning roles, including Executive,
    // receive an enrollment in their assigned wave.
    //
    // No default enrollment in Wave 001.
    // -------------------------------------------------------

    if (role !== "trainer" && programId) {
      const { error: enrollmentError } =
        await admin
          .from("program_enrollments")
          .upsert(
            {
              program_id: programId,
              learner_id: createdUser.id,
              status: "not_started",
            },
            {
              onConflict:
                "program_id,learner_id",
              ignoreDuplicates: true,
            }
          );

      if (enrollmentError) {
        console.error(
          "Unable to enroll new user:",
          enrollmentError
        );

        // Roll back the new account if enrollment fails.
        const { error: rollbackError } =
          await admin.auth.admin.deleteUser(
            createdUser.id
          );

        if (rollbackError) {
          console.error(
            "Unable to rollback user creation:",
            rollbackError
          );
        }

        return NextResponse.json(
          {
            error:
              "The account could not be enrolled in the selected training wave.",
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
    // The temporary password is returned only here.
    // It is not stored in plain text by this application.
    // -------------------------------------------------------

    return NextResponse.json(
      {
        user: {
          id: createdUser.id,
          fullName,
          email,
          role,

          teamLead: getTeamLead(
            role,
            teamLead
          ),

          activeProgramId:
            role === "trainer"
              ? null
              : programId,
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

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

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

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        {
          error: "Invalid account role.",
        },
        {
          status: 400,
        }
      );
    }

    // Prevent trainers from removing their own permissions.
    if (
      userId === auth.user.id &&
      role !== "trainer"
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot change your own Trainer role.",
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
        "id, full_name, email, role, team_lead, active_program_id"
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

    // -------------------------------------------------------
    // PROTECT ROLE CHANGES
    // -------------------------------------------------------

    // At least one active Trainer must remain.
    if (
      existingProfile.role === "trainer" &&
      role !== "trainer"
    ) {
      const {
        count,
        error: countError,
      } = await admin
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("role", "trainer")
        .eq("account_status", "active");

      if (
        countError ||
        (count ?? 0) <= 1
      ) {
        return NextResponse.json(
          {
            error:
              "At least one active Trainer must remain.",
          },
          {
            status: 400,
          }
        );
      }
    }

    // A Trainer without an assigned wave cannot be
    // converted directly into a learning role here.
    // This avoids creating an account with no enrollment.
    if (
      existingProfile.role === "trainer" &&
      role !== "trainer" &&
      !existingProfile.active_program_id
    ) {
      return NextResponse.json(
        {
          error:
            "This Trainer has no assigned training wave. Assign a wave before changing to a learning role.",
        },
        {
          status: 400,
        }
      );
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
          status: duplicateEmail ? 409 : 500,
        }
      );
    }

    // -------------------------------------------------------
    // UPDATE PROFILE
    //
    // Existing active wave and enrollments are preserved.
    // -------------------------------------------------------

    const { error: profileUpdateError } =
      await admin
        .from("profiles")
        .update({
          full_name: fullName,
          email,
          role,

          team_lead: getTeamLead(
            role,
            teamLead
          ),
        })
        .eq("id", userId);

    if (profileUpdateError) {
      console.error(
        "Unable to update user profile:",
        profileUpdateError
      );

      // Attempt to restore previous Auth values.
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
    // SUCCESS
    //
    // Editing a user does not create enrollments.
    // Wave assignments are managed separately.
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      user: {
        id: userId,
        fullName,
        email,
        role,

        teamLead: getTeamLead(
          role,
          teamLead
        ),

        activeProgramId:
          existingProfile.active_program_id,
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
//
// Permanent deletion remains disabled until the
// database dependency audit is completed.
// ===========================================================

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Permanent deletion is disabled. Deactivate the account instead to preserve training records.",
    },
    {
      status: 405,
    }
  );
}