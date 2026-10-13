import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import LearnerManagementPanel from "@/components/trainer/LearnerManagementPanel";
import ResetTraineeProgress from "@/components/trainer/ResetTraineeProgress";
import { createClient } from "@/lib/supabase/server";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";

type Props = {
  params: Promise<{
    learnerId: string;
  }>;
};

type LearnerSummaryRow = {
  learner_id: string;
  full_name: string | null;
  email: string | null;
  enrollment_status: string;
  enrolled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  progress_percent: number | string | null;
  completed_modules: number | string | null;
  total_modules: number | string | null;
  passed_quizzes: number | string | null;
  total_quizzes: number | string | null;
  needs_review: number | string | null;
  completed_checkpoints: number | string | null;
  total_checkpoints: number | string | null;
};

type AssessmentRow = {
  quiz_id: string;
  quiz_title: string;
  module_id: string | null;
  module_title: string | null;
  day_id: string | null;
  day_number: number | null;
  day_title: string | null;
  passing_score: number | string;
  max_attempts: number | null;
  is_required: boolean;
  attempt_count: number | string;
  latest_attempt_id: string | null;
  latest_attempt_number: number | null;
  latest_score: number | string | null;
  latest_passed: boolean | null;
  latest_status: string | null;
  latest_submitted_at: string | null;
};

type CheckpointRow = {
  checkpoint_id: string;
  quiz_id: string | null;
  title: string;
  description: string | null;
  checkpoint_type: string;
  day_id: string;
  day_number: number;
  day_title: string;
  day_position: number;
  checkpoint_position: number;
  is_required: boolean;
  passing_score: number | string | null;
  result_id: string | null;
  result_status: string | null;
  score: number | string | null;
  passed: boolean | null;
  submitted_at: string | null;
  graded_at: string | null;
  trainer_feedback: string | null;
  checkpoint_status: string;
};

type AttemptRow = {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  attempt_number: number;
  score: number | string | null;
  passed: boolean | null;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  graded_at: string | null;
};

type ActivityRow = {
  activity_type: string | null;
  activity_id: string;
  title: string;
  status: string | null;
  occurred_at: string | null;
  score: number | string | null;
};

export default async function LearnerDetailPage({
  params,
}: Props) {
  const { learnerId } = await params;

  const supabase = await createClient();

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // PROGRAM
  // ----------------------------------------------------------

  const program = await getTrainerProgram();

  if (!program) {
    notFound();
  }

  // ----------------------------------------------------------
  // TRAINER / TRAINEE DATA
  // ----------------------------------------------------------

  const [
    summaryResponse,
    assessmentsResponse,
    checkpointsResponse,
    attemptsResponse,
    activityResponse,
  ] = await Promise.all([
    supabase.rpc("get_trainer_learner_summary", {
      target_program_id: program.id,
      target_learner_id: learnerId,
    }),

    supabase.rpc("get_trainer_learner_assessments", {
      target_program_id: program.id,
      target_learner_id: learnerId,
    }),

    supabase.rpc("get_trainer_learner_checkpoints", {
      target_program_id: program.id,
      target_learner_id: learnerId,
    }),

    supabase.rpc("get_trainer_learner_attempt_history", {
      target_program_id: program.id,
      target_learner_id: learnerId,
    }),

    supabase.rpc("get_trainer_learner_activity", {
      target_program_id: program.id,
      target_learner_id: learnerId,
    }),
  ]);

  // ----------------------------------------------------------
  // ERRORS
  // ----------------------------------------------------------

  if (summaryResponse.error) {
    console.error(
      "Unable to load trainee summary:",
      summaryResponse.error
    );

    notFound();
  }

  if (assessmentsResponse.error) {
    console.error(
      "Unable to load trainee assessments:",
      assessmentsResponse.error
    );
  }

  if (checkpointsResponse.error) {
    console.error(
      "Unable to load trainee checkpoints:",
      checkpointsResponse.error
    );
  }

  if (attemptsResponse.error) {
    console.error(
      "Unable to load attempt history:",
      attemptsResponse.error
    );
  }

  if (activityResponse.error) {
    console.error(
      "Unable to load trainee activity:",
      activityResponse.error
    );
  }

  // ----------------------------------------------------------
  // NORMALIZE DATA
  // ----------------------------------------------------------

  const summaryRaw = summaryResponse.data;

  const summary = (
    Array.isArray(summaryRaw) ? summaryRaw[0] : summaryRaw
  ) as LearnerSummaryRow | null;

  if (!summary) {
    notFound();
  }

  const {
    data: learnerProfile,
    error: learnerProfileError,
  } = await supabase
    .from("profiles")
    .select("full_name, email, team_lead")
    .eq("id", learnerId)
    .single();

  if (learnerProfileError) {
    console.error(
      "Unable to load trainee profile:",
      learnerProfileError
    );
  }

  const assessments = (assessmentsResponse.data ??
    []) as AssessmentRow[];

  const checkpoints = (checkpointsResponse.data ??
    []) as CheckpointRow[];

  const attempts = (attemptsResponse.data ??
    []) as AttemptRow[];

  const activity = (activityResponse.data ??
    []) as ActivityRow[];

  // ----------------------------------------------------------
  // METRICS
  // ----------------------------------------------------------

  const progress = Math.max(
    0,
    Math.min(100, Number(summary.progress_percent ?? 0))
  );

  const completedModules = Number(
    summary.completed_modules ?? 0
  );

  const totalModules = Number(summary.total_modules ?? 0);

  const passedQuizzes = Number(
    summary.passed_quizzes ?? 0
  );

  const totalQuizzes = Number(summary.total_quizzes ?? 0);

  const completedCheckpoints = Number(
    summary.completed_checkpoints ?? 0
  );

  const totalCheckpoints = Number(
    summary.total_checkpoints ?? 0
  );

  const needsReview = Number(summary.needs_review ?? 0);

  const traineeName =
    learnerProfile?.full_name ??
    summary.full_name ??
    "Trainee";

  const traineeEmail =
    learnerProfile?.email ??
    summary.email ??
    "No email available";

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">
          {/* BACK */}

          <Link
            href="/trainer/learners"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium !text-[var(--text-muted)] transition hover:!text-[var(--text-primary)]"
          >
            <span aria-hidden="true">←</span>
            Back to trainees
          </Link>

          {/* PROFILE HEADER */}

          <section className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF8FA] text-[14px] font-semibold text-[#07879B]">
                {getInitials(traineeName, traineeEmail)}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
                  Trainee Profile
                </p>

                <h1 className="mt-1 truncate text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
                  {traineeName}
                </h1>

                <p className="mt-1 truncate text-[13px] text-[var(--text-secondary)]">
                  {traineeEmail}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/trainer/impersonate/${learnerId}`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#08A9C1]/25 bg-[#EAF8FA] px-4 text-[11px] font-semibold !text-[#07879B] transition hover:bg-[#DDF4F7]"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>

                Impersonate
              </Link>

              <StatusBadge
                status={summary.enrollment_status}
              />
            </div>
          </section>

          {/* MANAGEMENT */}

          <div className="mt-7">
            <LearnerManagementPanel
              learnerId={learnerId}
              programId={program.id}
              fullName={traineeName}
              email={
                learnerProfile?.email ?? summary.email
              }
              teamLead={
                learnerProfile?.team_lead ?? null
              }
              enrollmentStatus={
                summary.enrollment_status
              }
            />
          </div>

          {/* PROGRESS */}

          <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Overall onboarding progress
                </p>

                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-[32px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {Math.round(progress)}%
                  </p>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    completed
                  </p>
                </div>
              </div>

              {needsReview > 0 && (
                <Link
                  href="/trainer/review"
                  className="inline-flex min-h-9 items-center justify-center rounded-[9px] bg-amber-50 px-3.5 text-[11px] font-semibold !text-amber-700 transition hover:bg-amber-100"
                >
                  {needsReview}{" "}
                  {needsReview === 1
                    ? "review"
                    : "reviews"}{" "}
                  pending
                </Link>
              )}
            </div>

            <div className="border-t border-[var(--border-soft)] px-5 py-4 sm:px-6">
              <div className="h-2 overflow-hidden rounded-full bg-[#EEF2F4]">
                <div
                  className="h-full rounded-full bg-[#08A9C1] transition-[width]"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* METRICS */}

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Modules"
              value={`${completedModules}/${totalModules}`}
              helper="Completed"
            />

            <Metric
              label="Quizzes passed"
              value={`${passedQuizzes}/${totalQuizzes}`}
              helper="Passed assessments"
            />

            <Metric
              label="Checkpoints"
              value={`${completedCheckpoints}/${totalCheckpoints}`}
              helper="Completed"
            />

            <Metric
              label="Needs review"
              value={needsReview}
              helper="Awaiting trainer action"
            />
          </section>

          {/* CHECKPOINTS */}

          <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <SectionHeader
              eyebrow="Milestones"
              title="Checkpoints"
              description="Required onboarding checkpoints and trainee results."
              count={checkpoints.length}
            />

            {checkpoints.length === 0 ? (
              <EmptyState>
                No checkpoints are available for this program.
              </EmptyState>
            ) : (
              <div className="divide-y divide-[var(--border-soft)]">
                {checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.checkpoint_id}
                    className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[#FAFCFC] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#EAF8FA] px-2.5 py-1 text-[10px] font-semibold text-[#07879B]">
                          Day {checkpoint.day_number}
                        </span>

                        <span className="text-[10px] font-medium text-[var(--text-muted)]">
                          Checkpoint{" "}
                          {checkpoint.checkpoint_position}
                        </span>

                        {checkpoint.is_required && (
                          <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
                            Required
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-[13px] font-semibold text-[var(--text-primary)]">
                        {checkpoint.title}
                      </p>

                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {checkpoint.day_title}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {checkpoint.score !== null && (
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {Number(
                            checkpoint.score
                          ).toFixed(2)}
                          %
                        </span>
                      )}

                      <StatusBadge
                        status={
                          checkpoint.checkpoint_status
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ASSESSMENTS */}

          <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <SectionHeader
              title="Assessments"
              description="Module quizzes and latest trainee results."
              count={assessments.length}
            />

            {assessments.length === 0 ? (
              <EmptyState>
                No assessments are available.
              </EmptyState>
            ) : (
              <div className="divide-y divide-[var(--border-soft)]">
                {assessments.map((assessment) => (
                  <div
                    key={assessment.quiz_id}
                    className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[#FAFCFC] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      {assessment.day_number !==
                        null && (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                          Day {assessment.day_number}
                          {assessment.module_title
                            ? ` · ${assessment.module_title}`
                            : ""}
                        </p>
                      )}

                      <p className="mt-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
                        {assessment.quiz_title}
                      </p>

                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {Number(
                          assessment.attempt_count ?? 0
                        )}{" "}
                        {Number(
                          assessment.attempt_count ?? 0
                        ) === 1
                          ? "attempt"
                          : "attempts"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {assessment.latest_score !==
                        null && (
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {Number(
                            assessment.latest_score
                          ).toFixed(2)}
                          %
                        </span>
                      )}

                      <StatusBadge
                        status={
                          assessment.latest_status ===
                          "graded"
                            ? assessment.latest_passed
                              ? "passed"
                              : "failed"
                            : assessment.latest_status ??
                              "not_started"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ATTEMPT HISTORY */}

          <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <SectionHeader
              title="Attempt History"
              description="Assessment attempts and grading outcomes."
              count={attempts.length}
            />

            {attempts.length === 0 ? (
              <EmptyState>
                No assessment attempts yet.
              </EmptyState>
            ) : (
              <div className="divide-y divide-[var(--border-soft)]">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.attempt_id}
                    className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[#FAFCFC] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {attempt.quiz_title}
                      </p>

                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        Attempt {attempt.attempt_number}
                        {attempt.submitted_at
                          ? ` · ${formatDate(
                              attempt.submitted_at
                            )}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {attempt.score !== null && (
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {Number(
                            attempt.score
                          ).toFixed(2)}
                          %
                        </span>
                      )}

                      <StatusBadge
                        status={
                          attempt.status === "graded"
                            ? attempt.passed
                              ? "passed"
                              : "failed"
                            : attempt.status
                        }
                      />

                      {attempt.status ===
                        "needs_review" && (
                        <Link
                          href={`/trainer/review/${attempt.attempt_id}`}
                          className="inline-flex min-h-8 items-center rounded-[8px] px-2.5 text-[11px] font-semibold !text-[#07879B] transition hover:bg-[#EAF8FA]"
                        >
                          Review →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RECENT ACTIVITY */}

          <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <SectionHeader
              title="Recent Activity"
              description="Latest onboarding activity for this trainee."
              count={activity.length}
            />

            {activity.length === 0 ? (
              <EmptyState>
                No trainee activity yet.
              </EmptyState>
            ) : (
              <div className="divide-y divide-[var(--border-soft)]">
                {activity.map((item, index) => (
                  <div
                    key={`${item.activity_type ?? "activity"}-${item.activity_id}-${index}`}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#FAFCFC] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {item.title}
                      </p>

                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {formatLabel(
                          item.activity_type
                        )}
                        {item.occurred_at
                          ? ` · ${formatDate(
                              item.occurred_at
                            )}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {item.score !== null && (
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {Number(
                            item.score
                          ).toFixed(2)}
                          %
                        </span>
                      )}

                      {item.status && (
                        <StatusBadge
                          status={item.status}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* DANGER ZONE */}

          <ResetTraineeProgress
            learnerId={learnerId}
            programId={program.id}
            traineeName={traineeName}
          />
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

      <p className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
        {helper}
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
            {eyebrow}
          </p>
        )}

        <h2
          className={`text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] ${
            eyebrow ? "mt-1" : ""
          }`}
        >
          {title}
        </h2>

        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
        {count}
      </span>
    </div>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-7 text-[12px] text-[var(--text-muted)] sm:px-6">
      {children}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized =
    status?.toLowerCase() ?? "not_started";

  let styles =
    "bg-[#F2F4F7] text-[var(--text-secondary)]";

  if (
    normalized === "completed" ||
    normalized === "passed"
  ) {
    styles = "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "in_progress" ||
    normalized === "submitted"
  ) {
    styles = "bg-[#EAF8FA] text-[#07879B]";
  }

  if (normalized === "needs_review") {
    styles = "bg-amber-50 text-amber-700";
  }

  if (
    normalized === "failed" ||
    normalized === "not_passed"
  ) {
    styles = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${styles}`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function getInitials(
  fullName: string,
  email: string
) {
  if (fullName && fullName !== "Trainee") {
    return (
      fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) =>
          part.charAt(0).toUpperCase()
        )
        .join("") || "T"
    );
  }

  return email?.charAt(0).toUpperCase() || "T";
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatLabel(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}