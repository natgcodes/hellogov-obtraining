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