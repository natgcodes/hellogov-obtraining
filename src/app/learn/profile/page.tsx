import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ProfileForm from "@/components/profile/ProfileForm";
import { createClient } from "@/lib/supabase/server";
import { getLearnerJourney } from "@/lib/learning/getLearnerJourney";

export default async function LearnerProfilePage() {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ---------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select(
        "full_name, email, role, team_lead_id"
      )
      .eq("id", user.id)
      .single();

  if (profileError || !profile) {
    console.error(
      "Unable to load learner profile:",
      profileError
    );

    redirect("/login");
  }

  if (profile.role === "trainer") {
    redirect("/trainer");
  }

  // ---------------------------------------------------------
  // TEAM LEAD
  // ---------------------------------------------------------

  let teamLeadName: string | null = null;

  if (profile.team_lead_id) {
    const {
      data: teamLead,
      error: teamLeadError,
    } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", profile.team_lead_id)
      .maybeSingle();

    if (teamLeadError) {
      console.error(
        "Unable to load team lead:",
        teamLeadError
      );
    }

    teamLeadName =
      teamLead?.full_name ?? null;
  }

  // ---------------------------------------------------------
  // JOURNEY
  //
  // Keeps the learner sidebar consistent with the rest
  // of the Learning Center.
  // ---------------------------------------------------------

  const learnerJourney =
    await getLearnerJourney(user.id);

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <AppShell
      role="learner"
      userName={profile.full_name}
      userEmail={profile.email}
      learnerJourney={learnerJourney}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1180px]">
          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
              Account
            </p>

            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
              Profile
            </h1>

            <p className="mt-2 max-w-[680px] text-[14px] leading-6 text-[var(--text-secondary)]">
              Manage your personal information and
              review your account details.
            </p>
          </section>

          {/* =================================================
              PROFILE
          ================================================= */}

          <section className="mt-7 max-w-[760px] overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            {/* HEADER */}

            <div className="border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--teal-soft)] text-[16px] font-semibold text-[var(--teal-deep)]">
                  {(profile.full_name ||
                    profile.email ||
                    "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-[16px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                    {profile.full_name ||
                      "HelloGov Trainee"}
                  </h2>

                  <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                    {profile.email}
                  </p>
                </div>
              </div>
            </div>

            {/* EDITABLE PROFILE FORM */}

            <ProfileForm
              userId={user.id}
              fullName={profile.full_name}
              email={profile.email}
              teamLeadName={teamLeadName}
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}