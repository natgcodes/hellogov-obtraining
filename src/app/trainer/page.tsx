import Link from "next/link";
import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import EvaluationGrader from "@/components/trainer/EvaluationGrader";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";
import { createClient } from "@/lib/supabase/server";
import type { TrainerLearner } from "@/lib/trainer/types";

export default async function TrainerPage() {
  const supabase = await createClient();

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

  const [
    { data: learners },
    { data: checkpoints },
    { data: certs },
  ] = await Promise.all([
    supabase.rpc("get_trainer_learners", {
      target_program_id: HELLOGOV_PROGRAM_ID,
    }),

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
  ]);

  const traineeList =
    (learners ?? []) as TrainerLearner[];

  const averageProgress = traineeList.length
    ? traineeList.reduce(
        (total, trainee) =>
          total +
          Number(
            trainee.progress_percent ?? 0
          ),
        0
      ) / traineeList.length
    : 0;

  const completed = traineeList.filter(
    (trainee) =>
      trainee.enrollment_status === "completed"
  ).length;

  const quizPending = traineeList.reduce(
    (total, trainee) =>
      total +
      Number(trainee.needs_review ?? 0),
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
      trainee.enrollment_status ===
      "in_progress"
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

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">
          {/* HEADER */}

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

          {/* METRICS */}

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

          {/* REVIEW OVERVIEW */}

          <section className="mt-7 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Review queue
                </h2>

                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  Assessments currently waiting
                  for trainer action.
                </p>
              </div>

              <Link
                href="/trainer/review"
                className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-3.5 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
              >
                Review Center
              </Link>
            </div>

            {/* QUEUE SUMMARY */}

            <div className="grid border-b border-[var(--border-soft)] sm:grid-cols-3">
              <div className="px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Quiz reviews
                  </p>

                  <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {quizPending}
                  </span>
                </div>
              </div>

              <div className="border-t border-[var(--border-soft)] px-5 py-4 sm:border-l sm:border-t-0 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Checkpoints
                  </p>

                  <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {checkpointPending}
                  </span>
                </div>
              </div>

              <div className="border-t border-[var(--border-soft)] px-5 py-4 sm:border-l sm:border-t-0 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Certification
                  </p>

                  <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {certificationPending}
                  </span>
                </div>
              </div>
            </div>

            {/* PENDING REVIEWS */}

            {checkpointPending === 0 &&
            certificationPending === 0 ? (
              <div className="px-5 py-7 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF8FA] text-[#07879B]">
                    ✓
                  </div>

                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                      No manual evaluations pending
                    </p>

                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      New checkpoint and
                      certification submissions
                      will appear here.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-0 lg:grid-cols-2">
                {/* CHECKPOINTS */}

                <div className="p-5 sm:p-6 lg:border-r lg:border-[var(--border-soft)]">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                      Checkpoint Reviews
                    </h3>

                    <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                      {checkpointPending} pending
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(checkpoints ?? []).map(
                      (result: any) => {
                        const checkpoint =
                          Array.isArray(
                            result.checkpoints
                          )
                            ? result.checkpoints[0]
                            : result.checkpoints;

                        const trainee =
                          Array.isArray(
                            result.profiles
                          )
                            ? result.profiles[0]
                            : result.profiles;

                        return (
                          <div
                            key={result.id}
                            className="rounded-[14px] border border-[var(--border)] bg-[#FAFBFC] p-4"
                          >
                            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                              {checkpoint?.title}
                            </p>

                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                              {trainee?.full_name ||
                                trainee?.email ||
                                "Trainee"}
                            </p>

                            <div className="mt-4">
                              <EvaluationGrader
                                kind="checkpoint"
                                resultId={
                                  result.id
                                }
                              />
                            </div>
                          </div>
                        );
                      }
                    )}

                    {checkpointPending === 0 && (
                      <p className="py-4 text-[12px] text-[var(--text-muted)]">
                        No checkpoint reviews
                        pending.
                      </p>
                    )}
                  </div>
                </div>

                {/* CERTIFICATION */}

                <div className="border-t border-[var(--border-soft)] p-5 sm:p-6 lg:border-t-0">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
                      Certification Reviews
                    </h3>

                    <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                      {certificationPending} pending
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(certs ?? []).map(
                      (result: any) => {
                        const component =
                          Array.isArray(
                            result.certification_components
                          )
                            ? result
                                .certification_components[0]
                            : result.certification_components;

                        const trainee =
                          Array.isArray(
                            result.profiles
                          )
                            ? result.profiles[0]
                            : result.profiles;

                        return (
                          <div
                            key={result.id}
                            className="rounded-[14px] border border-[var(--border)] bg-[#FAFBFC] p-4"
                          >
                            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                              {component?.title}
                            </p>

                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                              {trainee?.full_name ||
                                trainee?.email ||
                                "Trainee"}
                            </p>

                            <div className="mt-4">
                              <EvaluationGrader
                                kind="certification"
                                resultId={
                                  result.id
                                }
                              />
                            </div>
                          </div>
                        );
                      }
                    )}

                    {certificationPending ===
                      0 && (
                      <p className="py-4 text-[12px] text-[var(--text-muted)]">
                        No certification reviews
                        pending.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* QUICK ACCESS */}

          <section className="mt-7">
            <div className="mb-3">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                Training management
              </h2>

              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Quick access to the main
                onboarding tools.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link
                href="/trainer/program"
                className="group rounded-[16px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)] transition hover:border-[#08A9C1]/30 hover:shadow-[var(--shadow-sm)]"
              >
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Program
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                  Manage onboarding content and
                  training structure.
                </p>

                <p className="mt-3 text-[11px] font-semibold text-[#07879B]">
                  Open program →
                </p>
              </Link>

              <Link
                href="/trainer/learners"
                className="group rounded-[16px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)] transition hover:border-[#08A9C1]/30 hover:shadow-[var(--shadow-sm)]"
              >
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Trainees
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                  Track individual progress and
                  onboarding status.
                </p>

                <p className="mt-3 text-[11px] font-semibold text-[#07879B]">
                  View trainees →
                </p>
              </Link>

              <Link
                href="/trainer/review"
                className="group rounded-[16px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)] transition hover:border-[#08A9C1]/30 hover:shadow-[var(--shadow-sm)]"
              >
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Review Center
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                  Review quiz answers and manual
                  assessments.
                </p>

                <p className="mt-3 text-[11px] font-semibold text-[#07879B]">
                  Open reviews →
                </p>
              </Link>

              <Link
                href="/trainer/questions"
                className="group rounded-[16px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-xs)] transition hover:border-[#08A9C1]/30 hover:shadow-[var(--shadow-sm)]"
              >
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Q&A
                </p>

                <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
                  Review and resolve trainee
                  questions.
                </p>

                <p className="mt-3 text-[11px] font-semibold text-[#07879B]">
                  Open Q&A →
                </p>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </AppShell>
  );
}