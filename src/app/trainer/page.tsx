import Link from "next/link";
import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import TrainingLeaderboard from "@/components/trainer/TrainingLeaderboard";
import CertificationAccessControl from "@/components/trainer/CertificationAccessControl";

import { getTrainerLeaderboard, combineLeaderboards } from "@/lib/trainer/getLeaderboard";
import DashboardWaveSelector from "@/components/trainer/DashboardWaveSelector";
import { createClient } from "@/lib/supabase/server";

import type { TrainerLearner } from "@/lib/trainer/types";

export default async function TrainerPage({ searchParams }: { searchParams: Promise<{ programId?: string }> }) {
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
    .select("full_name,email,role,account_status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "trainer" || profile.account_status !== "active") {
    redirect("/learn");
  }

  // ---------------------------------------------------------
  // TRAINER DASHBOARD DATA
  // ---------------------------------------------------------

  const { data: programs, error: programsError } = await supabase
    .from("programs").select("id,title,certification_enabled")
    .order("created_at", { ascending: false }).order("id");
  if (programsError) throw new Error("Could not load training waves.");
  const available = programs ?? [];
  const params = await searchParams;
  const selectedProgram = available.find(p => p.id === params.programId);
  const selected = selectedProgram?.id ?? "all";
  const selectedPrograms = selectedProgram ? [selectedProgram] : available;
  const results = await Promise.all(selectedPrograms.map(async program => {
    const [learners, checkpoints, certs, leaderboard, teamLeaders] = await Promise.all([
      supabase.rpc("get_trainer_learners", { target_program_id: program.id }),
      supabase.from("checkpoint_results")
        .select("id,checkpoints!inner(days!inner(program_id))", { count: "exact", head: true })
        .eq("status", "submitted").eq("checkpoints.days.program_id", program.id),
      supabase.from("certification_component_results")
        .select("id,certification_components!inner(certifications!inner(program_id))", { count: "exact", head: true })
        .eq("status", "submitted").eq("certification_components.certifications.program_id", program.id),
      getTrainerLeaderboard({ programId: program.id, programTitle: program.title }),
      getTrainerLeaderboard({ role: "team_leader", programId: program.id, programTitle: program.title }),
    ]);
    if (learners.error || checkpoints.error || certs.error) throw new Error("Could not load dashboard metrics for " + program.title);
    return { learners: (learners.data ?? []) as TrainerLearner[], checkpoints: checkpoints.count ?? 0, certs: certs.count ?? 0, leaderboard, teamLeaders };
  }));
  const leaderboard = combineLeaderboards(results.map(r => r.leaderboard));
  const teamLeaderLeaderboard = combineLeaderboards(results.map(r => r.teamLeaders));

  // ---------------------------------------------------------
  // TRAINEE METRICS
  // ---------------------------------------------------------

  const traineeList =
    results.flatMap(r => r.learners);

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
    results.reduce((sum, r) => sum + r.checkpoints, 0);

  const certificationPending =
    results.reduce((sum, r) => sum + r.certs, 0);

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
      label: selected === "all" ? "Trainee enrollments" : "Trainees",
      value: traineeList.length,
      helper: `${inProgress} currently in progress`,
    },
    {
      label: "Average progress",
      value: `${averageProgress.toFixed(0)}%`,
      helper: "Across selected onboarding enrollments",
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

          <DashboardWaveSelector programs={available} selected={selected} action="/trainer" />

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

          {selectedProgram ? <CertificationAccessControl
            key={selectedProgram.id}
            programId={selectedProgram.id}
            programTitle={selectedProgram.title}
            initialEnabled={selectedProgram.certification_enabled === true}
          /> : <p className="mt-7 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Select a specific wave to manage its certification access.</p>}

          {/* =================================================
              TRAINING LEADERBOARD
          ================================================= */}

          <TrainingLeaderboard key={selected} data={leaderboard} contentMode="trainer" />

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

            {teamLeaderLeaderboard.warning && <p className="mt-3 text-xs text-amber-800">{teamLeaderLeaderboard.warning}</p>}
            <div className="mt-5 space-y-3">
              {teamLeaderLeaderboard.learners
                .filter(
                  (learner) =>
                    learner.average != null
                )
                .map((learner) => (
                  <div
                    key={learner.enrollmentKey ?? learner.id}
                    className="flex justify-between border-b border-slate-100 py-2 text-sm"
                  >
                    <span>
                      #{learner.rank} · {learner.name} · {learner.programTitle}
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