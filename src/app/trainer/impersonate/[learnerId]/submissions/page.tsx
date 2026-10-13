import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import SubmissionHistory, {
  type SubmissionItem,
} from "@/components/learning/SubmissionHistory";

import { createClient } from "@/lib/supabase/server";
import { getImpersonatedLearnerJourney } from "@/lib/trainer/getImpersonatedLearner";

type PageProps = {
  params: Promise<{
    learnerId: string;
  }>;
};

export default async function ImpersonatedSubmissionsPage({
  params,
}: PageProps) {
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
    error: trainerProfileError,
  } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (
    trainerProfileError ||
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
    .select("id, full_name, email, role")
    .eq("id", learnerId)
    .single();

  if (
    traineeError ||
    !trainee ||
    trainee.role === "trainer"
  ) {
    notFound();
  }

  const traineeName =
    trainee.full_name?.trim() ||
    trainee.email ||
    "Trainee";

  // ============================================================
  // JOURNEY
  // ============================================================

  const journey =
    await getImpersonatedLearnerJourney(
      learnerId
    );

  // ============================================================
  // SUBMISSIONS
  // ============================================================

  const {
    data: attempts,
    error,
  } = await supabase
    .from("quiz_attempts")
    .select(`
      id,
      attempt_number,
      score,
      passed,
      status,
      started_at,
      submitted_at,
      graded_at,

      quizzes (
        id,
        title,
        passing_score,
        show_results,

        modules (
          id,
          title,
          day_id,

          days (
            id,
            day_number,
            title
          )
        ),

        checkpoints (
          id,
          title,
          checkpoint_type,
          position,
          day_id,

          days (
            id,
            day_number,
            title
          )
        )
      )
    `)
    .eq("learner_id", learnerId)
    .not("submitted_at", "is", null)
    .order("submitted_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Unable to load impersonated submissions:",
      error
    );
  }

  // ============================================================
  // NORMALIZE
  // ============================================================

  const submissions: SubmissionItem[] = (
    attempts ?? []
  ).flatMap((attempt) => {
    const quiz = Array.isArray(
      attempt.quizzes
    )
      ? attempt.quizzes[0]
      : attempt.quizzes;

    if (!quiz) {
      return [];
    }

    // ----------------------------------------------------------
    // MODULE QUIZ
    // ----------------------------------------------------------

    const moduleData = Array.isArray(
      quiz.modules
    )
      ? quiz.modules[0]
      : quiz.modules;

    const moduleDayRaw =
      moduleData?.days;

    const moduleDay = Array.isArray(
      moduleDayRaw
    )
      ? moduleDayRaw[0] ?? null
      : moduleDayRaw ?? null;

    // ----------------------------------------------------------
    // CHECKPOINT
    // ----------------------------------------------------------

    const checkpointRaw =
      quiz.checkpoints;

    const checkpoint = Array.isArray(
      checkpointRaw
    )
      ? checkpointRaw[0] ?? null
      : checkpointRaw ?? null;

    const checkpointDayRaw =
      checkpoint?.days;

    const checkpointDay = Array.isArray(
      checkpointDayRaw
    )
      ? checkpointDayRaw[0] ?? null
      : checkpointDayRaw ?? null;

    const isCheckpoint =
      Boolean(checkpoint);

    const day = isCheckpoint
      ? checkpointDay
      : moduleDay;

    // ----------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------

    const submissionStatus:
      | "passed"
      | "not_passed"
      | "pending" =
      attempt.status === "needs_review"
        ? "pending"
        : attempt.passed === true
          ? "passed"
          : "not_passed";

    // ----------------------------------------------------------
    // LABEL
    // ----------------------------------------------------------

    const assessmentLabel =
      isCheckpoint
        ? `Checkpoint ${
            Number(
              checkpoint?.position ?? 0
            ) || 1
          }`
        : "Quiz";

    // ----------------------------------------------------------
    // TITLE / CONTEXT
    // ----------------------------------------------------------

    const title = isCheckpoint
      ? checkpoint?.title ?? quiz.title
      : quiz.title;

    const subtitle = isCheckpoint
      ? checkpointDay
        ? `Day ${checkpointDay.day_number} · ${checkpointDay.title}`
        : null
      : moduleData?.title ?? null;

    const item: SubmissionItem = {
      id: attempt.id,

      title,
      subtitle,

      dayNumber:
        day?.day_number ?? null,

      type: isCheckpoint
        ? "checkpoint"
        : "quiz",

      assessmentLabel,

      attemptNumber:
        attempt.attempt_number,

      score:
        attempt.score === null
          ? null
          : Number(attempt.score),

      passingScore: Number(
        quiz.passing_score ?? 0
      ),

      status: submissionStatus,

      submittedAt:
        attempt.submitted_at,

      gradedAt:
        attempt.graded_at,
    };

    return [item];
  });

  // ============================================================
  // SUMMARY
  // ============================================================

  const totalSubmissions =
    submissions.length;

  const passedCount =
    submissions.filter(
      (submission) =>
        submission.status === "passed"
    ).length;

  const notPassedCount =
    submissions.filter(
      (submission) =>
        submission.status ===
        "not_passed"
    ).length;

  const pendingCount =
    submissions.filter(
      (submission) =>
        submission.status === "pending"
    ).length;

  const latestSubmission =
    submissions[0] ?? null;

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "en",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(new Date(value));
  }

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
        <div className="mx-auto max-w-[1180px]">

          {/* ===============================================
              IMPERSONATION BANNER
          =============================================== */}

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

          {/* ===============================================
              HEADER
          =============================================== */}

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
              Assessments
            </p>

            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
              Submissions
            </h1>

            <p className="mt-2 max-w-[680px] text-[14px] leading-6 text-[var(--text-secondary)]">
              Viewing {traineeName}&apos;s
              submitted quizzes and checkpoints,
              scores, feedback, and review status.
            </p>
          </section>

          {/* ===============================================
              SUMMARY
          =============================================== */}

          {!error &&
            totalSubmissions > 0 && (
              <section className="mt-7 overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4">

                  <div className="px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Submissions
                    </p>

                    <p className="mt-2 text-[21px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      {totalSubmissions}
                    </p>
                  </div>

                  <div className="border-t border-[var(--border-soft)] px-5 py-5 sm:border-l sm:border-t-0 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Passed
                    </p>

                    <p className="mt-2 text-[21px] font-semibold tracking-[-0.03em] text-emerald-600">
                      {passedCount}
                    </p>
                  </div>

                  <div className="border-t border-[var(--border-soft)] px-5 py-5 lg:border-l lg:border-t-0 lg:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Not passed
                    </p>

                    <p className="mt-2 text-[21px] font-semibold tracking-[-0.03em] text-red-500">
                      {notPassedCount}
                    </p>

                    {pendingCount > 0 && (
                      <p className="mt-1 text-[10px] text-amber-600">
                        {pendingCount} pending{" "}
                        {pendingCount === 1
                          ? "review"
                          : "reviews"}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-[var(--border-soft)] px-5 py-5 sm:border-l lg:border-t-0 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Latest
                    </p>

                    <p className="mt-2 text-[12px] font-medium text-[var(--text-secondary)]">
                      {formatDate(
                        latestSubmission?.submittedAt ??
                          null
                      )}
                    </p>
                  </div>
                </div>
              </section>
            )}

          {/* ===============================================
              ERROR / EMPTY / HISTORY
          =============================================== */}

          {error ? (
            <section className="mt-7 rounded-[16px] border border-red-100 bg-red-50 px-6 py-8">
              <h2 className="text-[14px] font-semibold text-red-800">
                Unable to load submissions
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-red-700">
                This trainee&apos;s submitted
                assessments could not be loaded.
              </p>
            </section>
          ) : totalSubmissions === 0 ? (
            <section className="mt-7 rounded-[16px] border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--teal-soft)] text-[var(--teal)]">
                ✓
              </div>

              <h2 className="mt-4 text-[15px] font-semibold text-[var(--text-primary)]">
                No submissions yet
              </h2>

              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                {traineeName} has not submitted
                any assessments yet.
              </p>
            </section>
          ) : (
            <section className="mt-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Submission History
                </p>

                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
                  Trainee assessments
                </h2>
              </div>

              <SubmissionHistory
                submissions={submissions}
                basePath={`/trainer/impersonate/${learnerId}/submissions`}
              />
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}