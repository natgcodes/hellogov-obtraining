import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getLearnerQuiz } from "@/lib/quizzes/getLearnerQuiz";
import { getImpersonatedLearnerJourney } from "@/lib/trainer/getImpersonatedLearner";

type Props = {
  params: Promise<{
    learnerId: string;
    quizId: string;
  }>;
};

type CheckpointResult = {
  status: string;
  score: number | null;
  passed: boolean | null;
  trainer_feedback: string | null;
  submitted_at: string | null;
  graded_at: string | null;
};

export default async function ImpersonatedQuizPage({
  params,
}: Props) {
  const { learnerId, quizId } = await params;
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

  const traineeName: string =
    trainee.full_name?.trim() ||
    trainee.email ||
    "Trainee";

  // ============================================================
  // TARGET TRAINEE JOURNEY
  //
  // We deliberately DO NOT use is_day_unlocked().
  // That RPC evaluates auth.uid(), which would be the trainer.
  // ============================================================

  const journey =
    await getImpersonatedLearnerJourney(
      learnerId
    );

  // ============================================================
  // QUIZ
  //
  // This is READ ONLY.
  // We never call start_quiz_attempt().
  // We never render QuizPlayer.
  // ============================================================

  const quiz =
    await getLearnerQuiz(quizId);

  if (!quiz) {
    notFound();
  }

  // ============================================================
  // DETERMINE ASSESSMENT SOURCE
  // ============================================================

  let dayId: string | null = null;
  let moduleTitle: string | null = null;

  let isCheckpoint = false;
  let checkpointId: string | null = null;
  let checkpointTitle: string | null = null;
  let checkpointType: string | null = null;
  let checkpointPosition: number | null =
    null;

  // ============================================================
  // NORMAL MODULE QUIZ
  // ============================================================

  if (quiz.module_id) {
    const {
      data: module,
      error: moduleError,
    } = await supabase
      .from("modules")
      .select(`
        id,
        title,
        day_id
      `)
      .eq("id", quiz.module_id)
      .single();

    if (moduleError || !module) {
      console.error(
        "Unable to load quiz module:",
        moduleError
      );

      notFound();
    }

    dayId = module.day_id;
    moduleTitle = module.title;
  }

  // ============================================================
  // CHECKPOINT QUIZ
  // ============================================================

  else {
    const {
      data: checkpoint,
      error: checkpointError,
    } = await supabase
      .from("checkpoints")
      .select(`
        id,
        title,
        checkpoint_type,
        position,
        day_id
      `)
      .eq("quiz_id", quiz.id)
      .maybeSingle();

    if (checkpointError) {
      console.error(
        "Unable to load checkpoint:",
        checkpointError
      );

      notFound();
    }

    if (!checkpoint) {
      notFound();
    }

    isCheckpoint = true;
    checkpointId = checkpoint.id;
    dayId = checkpoint.day_id;
    checkpointTitle = checkpoint.title;
    checkpointType =
      checkpoint.checkpoint_type;
    checkpointPosition =
      checkpoint.position;
  }

  if (!dayId) {
    notFound();
  }

  // ============================================================
  // TARGET TRAINEE DAY ACCESS
  //
  // Journey uses dayNumber, not day_number.
  // ============================================================

  const journeyDay =
    journey?.days?.find(
      (day) => day.id === dayId
    );

  const isUnlocked =
    journeyDay?.unlocked ?? false;

  // ============================================================
  // TARGET TRAINEE QUIZ ATTEMPTS
  // ============================================================

  const {
    data: attempts,
    error: attemptsError,
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
      graded_at
    `)
    .eq("quiz_id", quiz.id)
    .eq("learner_id", learnerId)
    .order("attempt_number", {
      ascending: false,
    });

  if (attemptsError) {
    console.error(
      "Unable to load trainee quiz attempts:",
      attemptsError
    );
  }

  const allAttempts = attempts ?? [];

  const submittedAttempts =
    allAttempts.filter(
      (attempt) =>
        attempt.submitted_at !== null
    );

  const latestSubmittedAttempt =
    submittedAttempts[0] ?? null;

  const inProgressAttempt =
    allAttempts.find(
      (attempt) =>
        attempt.submitted_at === null
    ) ?? null;

  // ============================================================
  // CHECKPOINT RESULT
  // ============================================================

  let checkpointResult:
    | CheckpointResult
    | null = null;

  if (isCheckpoint && checkpointId) {
    const {
      data: result,
      error: checkpointResultError,
    } = await supabase
      .from("checkpoint_results")
      .select(`
        status,
        score,
        passed,
        trainer_feedback,
        submitted_at,
        graded_at
      `)
      .eq(
        "checkpoint_id",
        checkpointId
      )
      .eq(
        "learner_id",
        learnerId
      )
      .maybeSingle();

    if (checkpointResultError) {
      console.error(
        "Unable to load checkpoint result:",
        checkpointResultError
      );
    }

    checkpointResult =
      (result as
        | CheckpointResult
        | null) ?? null;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function checkpointTypeLabel(
    type: string | null
  ) {
    if (!type) {
      return "Checkpoint";
    }

    const labels: Record<
      string,
      string
    > = {
      knowledge: "Knowledge",
      practical: "Practical",
      mock_call: "Mock Call",
      trainer_review: "Trainer Review",
      other: "Checkpoint",
    };

    return labels[type] ?? "Checkpoint";
  }

  function formatStatus(
    value: string | null | undefined
  ) {
    if (!value) {
      return "Not started";
    }

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  }

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
  // CURRENT STATE
  // ============================================================

  const latestStatus =
    checkpointResult?.status ??
    latestSubmittedAttempt?.status ??
    (inProgressAttempt
      ? "in_progress"
      : null);

  const latestScore =
    checkpointResult?.score ??
    (latestSubmittedAttempt?.score ===
      null ||
    latestSubmittedAttempt?.score ===
      undefined
      ? null
      : Number(
          latestSubmittedAttempt.score
        ));

  const latestPassed =
    checkpointResult?.passed ??
    latestSubmittedAttempt?.passed ??
    null;

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

            <Link
              href={`/trainer/learners/${learnerId}`}
              className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[#08A9C1]/30 bg-white px-3.5 text-[12px] font-semibold !text-[#07879B] transition hover:bg-[#F5FCFD]"
            >
              Exit impersonation
            </Link>
          </section>

          {/* ===============================================
              BACK
          =============================================== */}

          <Link
            href={`/trainer/impersonate/${learnerId}/day/${dayId}`}
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            ← Back to Day{" "}
            {journeyDay?.dayNumber ?? ""}
          </Link>

          {/* ===============================================
              QUIZ HEADER
          =============================================== */}

          <section className="mt-5 overflow-hidden rounded-[20px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <div className="px-6 py-7 sm:px-8">
              <div className="flex flex-wrap items-center gap-2">
                {isCheckpoint ? (
                  <>
                    <span className="rounded-full bg-[var(--purple-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--purple)]">
                      Checkpoint{" "}
                      {checkpointPosition !==
                      null
                        ? checkpointPosition +
                          1
                        : ""}
                    </span>

                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
                      {checkpointTypeLabel(
                        checkpointType
                      )}
                    </span>
                  </>
                ) : (
                  <span className="rounded-full bg-[var(--purple-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--purple)]">
                    Knowledge Check
                  </span>
                )}

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">
                  Read only
                </span>

                {!isUnlocked && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700">
                    Locked
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                {isCheckpoint
                  ? checkpointTitle ??
                    quiz.title
                  : quiz.title}
              </h1>

              {quiz.description && (
                <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
                  {quiz.description}
                </p>
              )}

              {!isCheckpoint &&
                moduleTitle && (
                  <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                    {moduleTitle}
                  </p>
                )}

              {quiz.instructions && (
                <div className="mt-5 rounded-[14px] border border-blue-100 bg-[var(--blue-soft)] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Instructions
                  </p>

                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-[var(--text-secondary)]">
                    {quiz.instructions}
                  </p>
                </div>
              )}
            </div>

            {/* SETTINGS */}

            <div className="grid border-t border-[var(--border-soft)] sm:grid-cols-4">
              <div className="px-6 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Passing score
                </p>

                <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
                  {quiz.passing_score}%
                </p>
              </div>

              <div className="border-t border-[var(--border-soft)] px-6 py-4 sm:border-l sm:border-t-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Max attempts
                </p>

                <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
                  {quiz.max_attempts ??
                    "Unlimited"}
                </p>
              </div>

              <div className="border-t border-[var(--border-soft)] px-6 py-4 sm:border-l sm:border-t-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Attempts used
                </p>

                <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
                  {allAttempts.length}
                </p>
              </div>

              <div className="border-t border-[var(--border-soft)] px-6 py-4 sm:border-l sm:border-t-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Status
                </p>

                <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
                  {formatStatus(
                    latestStatus
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* ===============================================
              TRAINEE STATE
          =============================================== */}

          <section className="mt-5 rounded-[18px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-xs)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Trainee status
            </p>

            {allAttempts.length === 0 ? (
              <div className="mt-4 rounded-[14px] border border-dashed border-[var(--border)] bg-[#FAFBFC] px-5 py-7 text-center">
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Not started
                </p>

                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  {traineeName} has not
                  started this assessment.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[14px] bg-[#F7F8FA] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Result
                  </p>

                  <p
                    className={`mt-2 text-[14px] font-semibold ${
                      latestPassed === true
                        ? "text-emerald-600"
                        : latestPassed ===
                            false
                          ? "text-red-500"
                          : "text-[var(--text-primary)]"
                    }`}
                  >
                    {latestPassed === true
                      ? "Passed"
                      : latestPassed ===
                          false
                        ? "Not passed"
                        : formatStatus(
                            latestStatus
                          )}
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#F7F8FA] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Score
                  </p>

                  <p className="mt-2 text-[14px] font-semibold text-[var(--text-primary)]">
                    {latestScore !== null
                      ? `${latestScore}%`
                      : "—"}
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#F7F8FA] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Last submitted
                  </p>

                  <p className="mt-2 text-[12px] font-medium text-[var(--text-primary)]">
                    {formatDate(
                      latestSubmittedAttempt?.submitted_at ??
                        null
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* SUBMISSION DETAILS */}

            {latestSubmittedAttempt && (
              <div className="mt-5 border-t border-[var(--border-soft)] pt-5">
                <Link
                  href={`/trainer/impersonate/${learnerId}/submissions/${latestSubmittedAttempt.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-[10px] bg-[var(--teal)] px-4 text-[12px] font-semibold !text-white transition hover:bg-[var(--teal-deep)]"
                >
                  View submitted answers
                </Link>
              </div>
            )}

            {/* IN PROGRESS */}

            {inProgressAttempt && (
              <div className="mt-5 rounded-[14px] border border-amber-100 bg-amber-50 px-4 py-4">
                <p className="text-[12px] font-semibold text-amber-800">
                  Assessment in progress
                </p>

                <p className="mt-1 text-[11px] leading-5 text-amber-700">
                  {traineeName} currently has
                  an unfinished attempt.
                  Impersonation mode will not
                  resume or modify it.
                </p>
              </div>
            )}

            {/* CHECKPOINT FEEDBACK */}

            {checkpointResult?.trainer_feedback && (
              <div className="mt-5 rounded-[14px] border border-[var(--border)] bg-[#FAFBFC] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Trainer feedback
                </p>

                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[var(--text-secondary)]">
                  {
                    checkpointResult.trainer_feedback
                  }
                </p>
              </div>
            )}
          </section>

          {/* ===============================================
              READ ONLY SAFETY
          =============================================== */}

          <section className="mt-5 rounded-[16px] border border-[#08A9C1]/15 bg-[#F3FBFC] px-5 py-4">
            <p className="text-[12px] font-semibold text-[#07879B]">
              Read-only assessment preview
            </p>

            <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
              Starting, answering, resuming,
              or submitting this assessment is
              disabled while impersonating a
              trainee. Existing trainee
              attempts remain unchanged.
            </p>
          </section>
        </main>
      </div>
    </AppShell>
  );
}