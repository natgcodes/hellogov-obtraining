import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getImpersonatedLearnerJourney } from "@/lib/trainer/getImpersonatedLearner";

type Props = {
  params: Promise<{
    learnerId: string;
  }>;
};

export default async function ImpersonatedProfilePage({
  params,
}: Props) {
  const { learnerId } = await params;
  const supabase = await createClient();

  // ============================================================
  // AUTH
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ============================================================
  // TRAINER SECURITY
  // ============================================================

  const {
    data: trainerProfile,
    error: trainerError,
  } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (
    trainerError ||
    !trainerProfile ||
    trainerProfile.role !== "trainer"
  ) {
    redirect("/learn");
  }

  // ============================================================
  // TARGET TRAINEE
  // ============================================================

  const {
    data: trainee,
    error: traineeError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      team_lead_id
    `)
    .eq("id", learnerId)
    .single();

  if (
    traineeError ||
    !trainee ||
    trainee.role === "trainer"
  ) {
    notFound();
  }

  const traineeName: string =
    trainee.full_name?.trim() ||
    trainee.email ||
    "Trainee";

  // ============================================================
  // TEAM LEAD
  // ============================================================

  let teamLeadName: string | null = null;
  let teamLeadEmail: string | null = null;

  if (trainee.team_lead_id) {
    const {
      data: teamLead,
      error: teamLeadError,
    } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", trainee.team_lead_id)
      .maybeSingle();

    if (teamLeadError) {
      console.error(
        "Unable to load trainee team lead:",
        teamLeadError
      );
    }

    if (teamLead) {
      teamLeadName =
        teamLead.full_name?.trim() ||
        teamLead.email ||
        null;

      teamLeadEmail =
        teamLead.email ?? null;
    }
  }

  // ============================================================
  // JOURNEY
  // ============================================================

  const journey =
    await getImpersonatedLearnerJourney(
      learnerId
    );

  // ============================================================
  // AVATAR INITIALS
  // ============================================================

  const avatarInitials =
    String(traineeName)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) =>
        part.charAt(0).toUpperCase()
      )
      .join("") || "T";

  // ============================================================
  // UI
  // ============================================================

  return (
    <AppShell
      role="trainer"
      userName={trainerProfile.full_name}
      userEmail={trainerProfile.email}
      learnerJourney={journey}
      impersonation={{
        learnerId,
        learnerName: traineeName,
        learnerEmail: trainee.email,
      }}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto max-w-4xl">
          {/* =================================================
              IMPERSONATION BANNER
          ================================================= */}

          <section className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-[#08A9C1]/20 bg-[#EAF8FA] px-5 py-4">
            <div>
              <p className="text-[12px] font-semibold text-[#07879B]">
                Impersonating {traineeName}
              </p>

              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                Read-only trainee preview
              </p>
            </div>

            <a
              href={`/trainer/learners/${learnerId}`}
              className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[#08A9C1]/30 bg-white px-3.5 text-[12px] font-semibold !text-[#07879B] transition hover:bg-[#F5FCFD]"
            >
              Exit impersonation
            </a>
          </section>

          {/* =================================================
              HEADER
          ================================================= */}

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
              Account
            </p>

            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
              Profile
            </h1>

            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
              Viewing the profile information
              available to {traineeName}.
            </p>
          </section>

          {/* =================================================
              PROFILE CARD
          ================================================= */}

          <section className="mt-7 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <div className="border-b border-[var(--border-soft)] px-6 py-5 sm:px-7">
              <div className="flex flex-wrap items-center gap-4">
                {/* AVATAR */}

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF8FA] text-[16px] font-semibold text-[#07879B]">
                  {avatarInitials}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                    {traineeName}
                  </h2>

                  <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                    {trainee.email}
                  </p>
                </div>

                <span className="ml-auto inline-flex rounded-full bg-[#EAF8FA] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#07879B]">
                  Trainee
                </span>
              </div>
            </div>

            {/* DETAILS */}

            <div className="divide-y divide-[var(--border-soft)]">
              <div className="grid gap-2 px-6 py-5 sm:grid-cols-[180px_1fr] sm:px-7">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                    Full name
                  </p>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    {trainee.full_name?.trim() ||
                      "Not provided"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 px-6 py-5 sm:grid-cols-[180px_1fr] sm:px-7">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                    Email
                  </p>
                </div>

                <div>
                  <p className="break-all text-[13px] font-medium text-[var(--text-primary)]">
                    {trainee.email ||
                      "Not provided"}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 px-6 py-5 sm:grid-cols-[180px_1fr] sm:px-7">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                    Role
                  </p>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    Trainee
                  </p>
                </div>
              </div>

              <div className="grid gap-2 px-6 py-5 sm:grid-cols-[180px_1fr] sm:px-7">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                    Team Lead
                  </p>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    {teamLeadName ||
                      "Not assigned"}
                  </p>

                  {teamLeadEmail &&
                    teamLeadEmail !==
                      teamLeadName && (
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {teamLeadEmail}
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* READ ONLY */}

            <div className="border-t border-[var(--border-soft)] bg-[#FAFBFC] px-6 py-4 sm:px-7">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                  Read only
                </span>

                <p className="text-[11px] text-[var(--text-muted)]">
                  Profile changes are disabled
                  while impersonating a trainee.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </AppShell>
  );
}