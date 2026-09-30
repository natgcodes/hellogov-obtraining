import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CreateUserBody = {
  fullName?: string;
  email?: string;
  role?: "learner" | "trainer";
  teamLead?: string | null;
};

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------
    // VERIFY CURRENT USER
    // -------------------------------------------------------

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        {
          status: 401,
        }
      );
    }

    // -------------------------------------------------------
    // VERIFY TRAINER ROLE
    // -------------------------------------------------------

    const {
      data: trainerProfile,
      error: trainerProfileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      trainerProfileError ||
      trainerProfile?.role !== "trainer"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create users.",
        },
        {
          status: 403,
        }
      );
    }

    // -------------------------------------------------------
    // REQUEST BODY
    // -------------------------------------------------------

    const body =
      (await request.json()) as CreateUserBody;

    const fullName = body.fullName?.trim();
    const email = body.email
      ?.trim()
      .toLowerCase();
   const role = body.role;
const teamLead =
  body.teamLead?.trim() || null;

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

    if (
      role !== "learner" &&
      role !== "trainer"
    ) {
      return NextResponse.json(
        {
          error:
            "Role must be learner or trainer.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // ADMIN CLIENT
    // -------------------------------------------------------

    const admin = createAdminClient();

    // -------------------------------------------------------
    // CREATE AUTH USER
    //
    // No password is created here.
    // The user will receive an invitation email and choose
    // their password through Supabase.
    // -------------------------------------------------------

    const {
  data: inviteData,
  error: inviteError,
} =
  await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/setup-password`,
      data: {
        full_name: fullName,
        role,
      },
    }
  );

    if (inviteError) {
      console.error(
        "Unable to invite user:",
        inviteError
      );

      const duplicateUser =
        inviteError.message
          .toLowerCase()
          .includes("already");

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

    const createdUser = inviteData.user;

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
    // PROFILE
    //
    // Upsert makes this compatible with projects that already
    // create a profile automatically through an auth trigger.
    // -------------------------------------------------------

    const {
      error: profileError,
    } = await admin
      .from("profiles")
      .upsert(
        {
  id: createdUser.id,
  full_name: fullName,
  email,
  role,
  team_lead:
    role === "learner"
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

      // Avoid leaving an Auth account without a usable
      // application profile.
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
    // SUCCESS
    // -------------------------------------------------------

    return NextResponse.json(
      {
        user: {
          id: createdUser.id,
          fullName,
          email,
          role,
        },
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
type DeleteUserBody = {
  userId?: string;
};

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const { data: trainerProfile, error: trainerProfileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      trainerProfileError ||
      trainerProfile?.role !== "trainer"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to delete users.",
        },
        { status: 403 }
      );
    }

    const body =
      (await request.json()) as DeleteUserBody;

    const userId = body.userId?.trim();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    // Trainers cannot delete their own account.
    if (userId === user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot delete your own account.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // A trainer who created a program cannot be deleted while
    // programs.created_by still references their profile.
    const {
      data: createdProgram,
      error: programCheckError,
    } = await admin
      .from("programs")
      .select("id")
      .eq("created_by", userId)
      .limit(1)
      .maybeSingle();

    if (programCheckError) {
      console.error(
        "Unable to check program ownership:",
        programCheckError
      );

      return NextResponse.json(
        {
          error:
            "We couldn't verify whether this user can be deleted.",
        },
        { status: 500 }
      );
    }

    if (createdProgram) {
      return NextResponse.json(
        {
          error:
            "This trainer cannot be deleted because they are the creator of a program.",
        },
        { status: 409 }
      );
    }

    // Deleting the Auth user removes the matching profile.
    // Learner-related records are removed through the
    // database's ON DELETE CASCADE relationships.
    const { error: deleteError } =
      await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error(
        "Unable to delete user:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "We couldn't delete this account. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Unexpected delete-user error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while deleting the account.",
      },
      { status: 500 }
    );
  }
}
