import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import LearnerManagementPanel from "@/components/trainer/LearnerManagementPanel";
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "trainer") {
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
  // TRAINER / LEARNER DATA
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
      "Unable to load learner summary:",
      summaryResponse.error
    );

    notFound();
  }

  if (assessmentsResponse.error) {
    console.error(
      "Unable to load learner assessments:",
      assessmentsResponse.error
    );
  }

  if (checkpointsResponse.error) {
    console.error(
      "Unable to load learner checkpoints:",
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
      "Unable to load learner activity:",
      activityResponse.error
    );
  }

  // ----------------------------------------------------------
  // NORMALIZE DATA
  // ----------------------------------------------------------

  const summaryRaw = summaryResponse.data;

  const summary = (
    Array.isArray(summaryRaw)
      ? summaryRaw[0]
      : summaryRaw
  ) as LearnerSummaryRow | null;

  if (!summary) {
    notFound();
  }

  const { data: learnerProfile, error: learnerProfileError } =
  await supabase
    .from("profiles")
    .select("full_name, email, team_lead")
    .eq("id", learnerId)
    .single();

if (learnerProfileError) {
  console.error(
    "Unable to load learner profile:",
    learnerProfileError
  );
}

  const assessments =
    (assessmentsResponse.data ?? []) as AssessmentRow[];

  const checkpoints =
    (checkpointsResponse.data ?? []) as CheckpointRow[];

  const attempts =
    (attemptsResponse.data ?? []) as AttemptRow[];

  const activity =
    (activityResponse.data ?? []) as ActivityRow[];

  // ----------------------------------------------------------
  // METRICS
  // ----------------------------------------------------------

  const progress = Number(
    summary.progress_percent ?? 0
  );

  const completedModules = Number(
    summary.completed_modules ?? 0
  );

  const totalModules = Number(
    summary.total_modules ?? 0
  );

  const passedQuizzes = Number(
    summary.passed_quizzes ?? 0
  );

  const totalQuizzes = Number(
    summary.total_quizzes ?? 0
  );

  const completedCheckpoints = Number(
    summary.completed_checkpoints ?? 0
  );

  const totalCheckpoints = Number(
    summary.total_checkpoints ?? 0
  );

  const needsReview = Number(
    summary.needs_review ?? 0
  );

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  return (
    <AppShell role="trainer">
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/trainer/learners"
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to learners
        </Link>

        {/* PROFILE HEADER */}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
              Learner Profile
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {summary.full_name || "Learner"}
            </h1>

            <p className="mt-1 text-slate-500">
              {summary.email || "No email available"}
            </p>
          </div>

          <StatusBadge
            status={summary.enrollment_status}
          />
        </div>

        {/* TRAINEE MANAGEMENT */}

<LearnerManagementPanel
  learnerId={learnerId}
  programId={program.id}
  fullName={
    learnerProfile?.full_name ??
    summary.full_name
  }
  email={
    learnerProfile?.email ??
    summary.email
  }
  teamLead={
    learnerProfile?.team_lead ?? null
  }
  enrollmentStatus={
    summary.enrollment_status
  }
/>

        {/* PROGRESS */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Overall onboarding progress
              </p>

              <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
                {Math.round(progress)}%
              </p>
            </div>

            {needsReview > 0 && (
              <Link
                href="/trainer/review"
                className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                {needsReview}{" "}
                {needsReview === 1
                  ? "review"
                  : "reviews"}{" "}
                pending
              </Link>
            )}
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#e84545]"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, progress)
                )}%`,
              }}
            />
          </div>
        </section>

        {/* METRICS */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Modules"
            value={`${completedModules}/${totalModules}`}
          />

          <Metric
            label="Quizzes passed"
            value={`${passedQuizzes}/${totalQuizzes}`}
          />

          <Metric
            label="Checkpoints"
            value={`${completedCheckpoints}/${totalCheckpoints}`}
          />

          <Metric
            label="Needs review"
            value={needsReview}
          />
        </div>

        {/* CHECKPOINTS */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-purple-600">
              Milestones
            </p>

            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Checkpoints
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Required onboarding checkpoints and
              learner results.
            </p>
          </div>

          {checkpoints.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No checkpoints are available for
              this program.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {checkpoints.map((checkpoint) => (
                <div
                  key={checkpoint.checkpoint_id}
                  className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Day {checkpoint.day_number}
                      </span>

                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
                        Checkpoint{" "}
                        {checkpoint.checkpoint_position}
                      </span>

                      {checkpoint.is_required && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                          Required
                        </span>
                      )}
                    </div>

                    <p className="mt-2 font-semibold text-slate-900">
                      {checkpoint.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {checkpoint.day_title}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {checkpoint.score !== null && (
                      <span className="font-semibold text-slate-900">
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Assessments
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Module quizzes and latest learner
            results.
          </p>

          {assessments.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No assessments are available.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {assessments.map((assessment) => (
                <div
                  key={assessment.quiz_id}
                  className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    {assessment.day_number !== null && (
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Day {assessment.day_number}
                        {assessment.module_title
                          ? ` · ${assessment.module_title}`
                          : ""}
                      </p>
                    )}

                    <p className="mt-1 font-medium text-slate-900">
                      {assessment.quiz_title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
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

                  <div className="flex items-center gap-4">
                    {assessment.latest_score !== null && (
                      <span className="font-semibold text-slate-900">
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Attempt History
          </h2>

          {attempts.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No assessment attempts yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {attempts.map((attempt) => (
                <div
                  key={attempt.attempt_id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {attempt.quiz_title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Attempt {attempt.attempt_number}
                      {attempt.submitted_at
                        ? ` · ${formatDate(
                            attempt.submitted_at
                          )}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {attempt.score !== null && (
                      <span className="font-semibold text-slate-900">
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
                        className="text-sm font-semibold text-[#e84545] hover:text-[#c93636]"
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Recent Activity
          </h2>

          {activity.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              No learner activity yet.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-slate-100">
              {activity.map((item, index) => (
                <div
                  key={`${item.activity_type ?? "activity"}-${item.activity_id}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
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

                  <div className="flex items-center gap-3">
                    {item.score !== null && (
                      <span className="text-sm font-semibold text-slate-800">
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
      </main>
    </AppShell>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
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
    "bg-slate-100 text-slate-600";

  if (
    normalized === "completed" ||
    normalized === "passed"
  ) {
    styles =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "in_progress" ||
    normalized === "submitted"
  ) {
    styles =
      "bg-blue-50 text-blue-700";
  }

  if (normalized === "needs_review") {
    styles =
      "bg-amber-50 text-amber-700";
  }

  if (
    normalized === "failed" ||
    normalized === "not_passed"
  ) {
    styles =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles}`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
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