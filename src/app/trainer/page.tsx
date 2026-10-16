import Link from "next/link";
import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import TrainingLeaderboard from "@/components/trainer/TrainingLeaderboard";
import CertificationAccessControl from "@/components/trainer/CertificationAccessControl";

import { getTrainerLeaderboard } from "@/lib/trainer/getLeaderboard";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";
import { createClient } from "@/lib/supabase/server";

import type { TrainerLearner } from "@/lib/trainer/types";

export default async function TrainerPage() {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "trainer") {
    redirect("/learn");
  }

  // ---------------------------------------------------------
  // TRAINER DASHBOARD DATA
  // ---------------------------------------------------------

  const [
    { data: learners },
    { data: checkpoints },
    { data: certs },
    {
      data: programSettings,
      error: certificationSettingsError,
    },
  ] = await Promise.all([
    // Trainees
    supabase.rpc("get_trainer_learners", {
      target_program_id: HELLOGOV_PROGRAM_ID,
    }),

    // Pending checkpoints
    supabase
      .from("checkpoint_results")
      .select(
        `
        id,
        status,
        submitted_at,
        learner_id,
        checkpoints!inner(
          id,
          title,
          passing_score,
          days!inner(program_id)
        ),
        profiles!checkpoint_results_learner_id_fkey(
          full_name,
          email
        )
        `
      )
      .eq("status", "submitted")
      .eq(
        "checkpoints.days.program_id",
        HELLOGOV_PROGRAM_ID
      ),

    // Pending certification reviews
    supabase
      .from("certification_component_results")
      .select(
        `
        id,
        status,
        submitted_at,
        learner_id,
        certification_components!inner(
          id,
          title,
          passing_score,
          certifications!inner(program_id)
        ),
        profiles!certification_component_results_learner_id_fkey(
          full_name,
          email
        )
        `
      )
      .eq("status", "submitted")
      .eq(
        "certification_components.certifications.program_id",
        HELLOGOV_PROGRAM_ID
      ),

    // Global certification access
    supabase
      .from("programs")
      .select("certification_enabled")
      .eq("id", HELLOGOV_PROGRAM_ID)
      .single(),
  ]);

  // ---------------------------------------------------------
  // CERTIFICATION SETTINGS
  // ---------------------------------------------------------

  if (certificationSettingsError) {
    console.error(
      "Unable to load certification settings:",
      certificationSettingsError
    );
  }

  const certificationEnabled =
    programSettings?.certification_enabled === true;

  // ---------------------------------------------------------
  // LEADERBOARDS
  // ---------------------------------------------------------

  const leaderboard = await getTrainerLeaderboard();

  const teamLeaderLeaderboard =
    await getTrainerLeaderboard({
      role: "team_leader",
    });

  // ---------------------------------------------------------
  // TRAINEE METRICS
  // ---------------------------------------------------------

  const traineeList =
    (learners ?? []) as TrainerLearner[];

  const averageProgress = traineeList.length
    ? traineeList.reduce(
        (total, trainee) =>
          total +
          Number(trainee.progress_percent ?? 0),
        0
      ) / traineeList.length
    : 0;

  const completed = traineeList.filter(
    (trainee) =>
      trainee.enrollment_status === "completed"
  ).length;

  const quizPending = traineeList.reduce(
    (total, trainee) =>
      total + Number(trainee.needs_review ?? 0),
    0
  );

  const checkpointPending =
    checkpoints?.length ?? 0;

  const certificationPending =
    certs?.length ?? 0;

  const totalPendingReviews =
    quizPending +
    checkpointPending +
    certificationPending;

  const inProgress = traineeList.filter(
    (trainee) =>
      trainee.enrollment_status === "in_progress"
  ).length;

  const metrics = [
    {
      label: "Trainees",
      value: traineeList.length,
      helper: `${inProgress} currently in progress`,
    },
    {
      label: "Average progress",
      value: `${averageProgress.toFixed(0)}%`,
      helper: "Across active onboarding",
    },
    {
      label: "Completed",
      value: completed,
      helper: "Onboarding completions",
    },
    {
      label: "Needs review",
      value: totalPendingReviews,
      helper: "Assessments awaiting action",
    },
  ];

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">
          {/* =================================================
              HEADER
          ================================================= */}

          <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
                Training Operations
              </p>

              <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
                Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
                Monitor onboarding progress,
                pending reviews and trainee
                activity from one place.
              </p>
            </div>

            <Link
              href="/trainer/learners"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[10px] bg-[#101828] px-4 text-[12px] font-semibold !text-white transition hover:bg-[#1D2939]"
            >
              View trainees
            </Link>
          </section>

          {/* =================================================
              METRICS
          ================================================= */}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[18px] border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow-xs)]"
              >
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                  {metric.label}
                </p>

                <p className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {metric.value}
                </p>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {metric.helper}
                </p>
              </div>
            ))}
          </section>

          {/* =================================================
              GLOBAL CERTIFICATION ACCESS
          ================================================= */}

          <CertificationAccessControl
            initialEnabled={certificationEnabled}
          />

          {/* =================================================
              TRAINING LEADERBOARD
          ================================================= */}

          <TrainingLeaderboard data={leaderboard} />

          {/* =================================================
              TEAM LEADER RANKING
          ================================================= */}

          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">
              Team Leader Ranking
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Individual onboarding results for Team
              Leaders. Visible only to Trainers.
            </p>

            <div className="mt-5 space-y-3">
              {teamLeaderLeaderboard.learners
                .filter(
                  (learner) =>
                    learner.average != null
                )
                .map((learner) => (
                  <div
                    key={learner.id}
                    className="flex justify-between border-b border-slate-100 py-2 text-sm"
                  >
                    <span>
                      #{learner.rank} · {learner.name}
                    </span>

                    <span>
                      {learner.average?.toFixed(1)}% ·{" "}
                      {learner.gradedCount}/
                      {learner.expectedCount} graded
                    </span>
                  </div>
                ))}
            </div>

            {!teamLeaderLeaderboard.learners.some(
              (learner) =>
                learner.average != null
            ) && (
              <p className="mt-4 text-sm text-slate-400">
                No Team Leaders have graded quizzes yet.
              </p>
            )}
          </section>
        </main>
      </div>
    </AppShell>
  );
}