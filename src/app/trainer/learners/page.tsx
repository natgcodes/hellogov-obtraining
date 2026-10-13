import Link from "next/link";
import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";

type TrainerLearner = {
  learner_id: string;
  full_name: string | null;
  email: string | null;
  enrollment_status: string;
  progress_percent: number | null;
  completed_modules: number;
  total_modules: number;
  passed_quizzes: number;
  total_quizzes: number;
  needs_review: number;
};

export default async function TrainerLearnersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "trainer") {
    redirect("/learn");
  }

  const program = await getTrainerProgram();

  if (!program) {
    return (
      <AppShell
        role="trainer"
        userName={profile.full_name}
        userEmail={profile.email}
      >
        <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
          <main className="mx-auto w-full max-w-[1440px]">
            <div className="rounded-[18px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-xs)]">
              <h1 className="text-[16px] font-semibold text-[var(--text-primary)]">
                Program unavailable
              </h1>

              <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                No onboarding program could be found.
              </p>
            </div>
          </main>
        </div>
      </AppShell>
    );
  }

  const { data, error } = await supabase.rpc(
    "get_trainer_learners",
    {
      target_program_id: program.id,
    }
  );

  const learners = (data ?? []) as TrainerLearner[];

  const totalLearners = learners.length;

  const completed = learners.filter(
    (learner) =>
      learner.enrollment_status === "completed"
  ).length;

  const needsReview = learners.reduce(
    (total, learner) =>
      total + Number(learner.needs_review ?? 0),
    0
  );

  const averageProgress =
    totalLearners > 0
      ? learners.reduce(
          (total, learner) =>
            total +
            Number(learner.progress_percent ?? 0),
          0
        ) / totalLearners
      : 0;

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
                Trainees
              </h1>

              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
                Track onboarding progress,
                assessments and certification
                status for every trainee.
              </p>
            </div>

            <Link
              href="/trainer/review"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[10px] bg-[#101828] px-4 text-[12px] font-semibold !text-white transition hover:bg-[#1D2939]"
            >
              Review Center
              {needsReview > 0
                ? ` (${needsReview})`
                : ""}
            </Link>
          </section>

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
              {error.message}
            </div>
          )}

          {/* METRICS */}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Trainees"
              value={totalLearners}
              helper="Enrolled in onboarding"
            />

            <Metric
              label="Average progress"
              value={`${Math.round(
                averageProgress
              )}%`}
              helper="Across all trainees"
            />

            <Metric
              label="Completed"
              value={completed}
              helper="Onboarding completions"
            />

            <Metric
              label="Needs review"
              value={needsReview}
              helper="Assessments awaiting action"
            />
          </section>

          {/* ROSTER */}

          <section className="mt-7 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Onboarding roster
                </h2>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {totalLearners}{" "}
                  {totalLearners === 1
                    ? "trainee"
                    : "trainees"}{" "}
                  enrolled
                </p>
              </div>
            </div>

            {learners.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF8FA] text-[#07879B]">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle
                      cx="9"
                      cy="8"
                      r="3"
                    />
                    <path d="M3.5 19c.6-3.2 2.4-5 5.5-5s4.9 1.8 5.5 5" />
                    <path d="M16 6.5a2.5 2.5 0 0 1 0 5" />
                    <path d="M17 14c2.1.5 3.2 2 3.5 4" />
                  </svg>
                </div>

                <p className="mt-3 text-[13px] font-semibold text-[var(--text-primary)]">
                  No trainees yet
                </p>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  No trainees have started this
                  program yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-[#FAFBFC]">
                    <tr className="border-b border-[var(--border-soft)]">
                      <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Trainee
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Progress
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Modules
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Quizzes
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Review
                      </th>

                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Status
                      </th>

                      <th className="px-6 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {learners.map((learner) => {
                      const progress = Math.max(
                        0,
                        Math.min(
                          100,
                          Number(
                            learner.progress_percent ??
                              0
                          )
                        )
                      );

                      const pendingReviews =
                        Number(
                          learner.needs_review ?? 0
                        );

                      return (
                        <tr
                          key={learner.learner_id}
                          className="transition-colors hover:bg-[#FAFCFC]"
                        >
                          {/* TRAINEE */}

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF8FA] text-[11px] font-semibold text-[#07879B]">
                                {getInitials(
                                  learner.full_name,
                                  learner.email
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-[13px] font-semibold text-[var(--text-primary)]">
                                  {learner.full_name ||
                                    "Trainee"}
                                </p>

                                <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-[var(--text-muted)]">
                                  {learner.email ||
                                    "—"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* PROGRESS */}

                          <td className="px-4 py-4">
                            <div className="w-36">
                              <div className="mb-1.5 flex items-center justify-between gap-3">
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  Progress
                                </span>

                                <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                                  {Math.round(
                                    progress
                                  )}
                                  %
                                </span>
                              </div>

                              <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F4]">
                                <div
                                  className="h-full rounded-full bg-[#08A9C1] transition-[width]"
                                  style={{
                                    width: `${progress}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* MODULES */}

                          <td className="px-4 py-4">
                            <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                              {Number(
                                learner.completed_modules ??
                                  0
                              )}
                              <span className="mx-1 text-[var(--text-muted)]">
                                /
                              </span>
                              {Number(
                                learner.total_modules ??
                                  0
                              )}
                            </p>
                          </td>

                          {/* QUIZZES */}

                          <td className="px-4 py-4">
                            <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                              {Number(
                                learner.passed_quizzes ??
                                  0
                              )}
                              <span className="mx-1 text-[var(--text-muted)]">
                                /
                              </span>
                              {Number(
                                learner.total_quizzes ??
                                  0
                              )}
                            </p>
                          </td>

                          {/* REVIEW */}

                          <td className="px-4 py-4">
                            {pendingReviews > 0 ? (
                              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                                {pendingReviews}{" "}
                                {pendingReviews === 1
                                  ? "pending"
                                  : "pending"}
                              </span>
                            ) : (
                              <span className="text-[12px] text-[var(--text-muted)]">
                                —
                              </span>
                            )}
                          </td>

                          {/* STATUS */}

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={
                                learner.enrollment_status
                              }
                            />
                          </td>

                          {/* ACTION */}

                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/trainer/learners/${learner.learner_id}`}
                              className="inline-flex min-h-8 items-center justify-center rounded-[8px] px-2.5 text-[11px] font-semibold !text-[#07879B] transition hover:bg-[#EAF8FA]"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow-xs)]">
      <p className="text-[12px] font-medium text-[var(--text-secondary)]">
        {label}
      </p>

      <p className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
        {helper}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "in_progress"
        ? "bg-[#EAF8FA] text-[#07879B]"
        : "bg-[#F2F4F7] text-[var(--text-secondary)]";

  const label = status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

function getInitials(
  fullName: string | null,
  email: string | null
) {
  const source =
    fullName?.trim() ||
    email?.trim() ||
    "Trainee";

  if (fullName?.trim()) {
    return fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) =>
        part.charAt(0).toUpperCase()
      )
      .join("");
  }

  return source.charAt(0).toUpperCase();
}