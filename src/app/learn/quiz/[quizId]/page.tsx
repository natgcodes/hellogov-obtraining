import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import QuizPlayer from "@/components/quizzes/QuizPlayer";

import { createClient } from "@/lib/supabase/server";
import { getLearnerQuiz } from "@/lib/quizzes/getLearnerQuiz";
import { getLearnerJourney } from "@/lib/learning/getLearnerJourney";
import { getLearnerAssignedProgram } from "@/lib/learning/getLearnerAssignedProgram";

type Props = {
  params: Promise<{
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

function checkpointTypeLabel(type: string | null) {
  if (!type) {
    return "Checkpoint";
  }

  const labels: Record<string, string> = {
    knowledge: "Knowledge",
    practical: "Practical",
    mock_call: "Mock Call",
    trainer_review: "Trainer Review",
    other: "Checkpoint",
  };

  return labels[type] ?? "Checkpoint";
}

export default async function LearnerQuizPage({
  params,
}: Props) {
  const { quizId } = await params;

  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error(
      "Unable to load learner session:",
      authError
    );
  }

  if (!user) {
    redirect("/login");
  }

  // ---------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("full_name, email, role")
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

  const allowedLearningRoles = [
    "learner",
    "observer",
    "cross_training",
    "team_leader",
    "executive",
  ] as const;

  type LearningRole =
    (typeof allowedLearningRoles)[number];

  if (
    !allowedLearningRoles.some(
      (role) => role === profile.role
    )
  ) {
    redirect("/login");
  }

  const learningRole = profile.role as LearningRole;

  // ---------------------------------------------------------
  // RESOLVE LEARNER'S ASSIGNED WAVE
  // ---------------------------------------------------------

  const programId = await getLearnerAssignedProgram();

  if (!programId) {
    notFound();
  }

  // ---------------------------------------------------------
  // LEARNER JOURNEY
  // ---------------------------------------------------------

  const learnerJourney = await getLearnerJourney(
    user.id
  );

  if (!learnerJourney) {
    console.error(
      "Unable to load learner journey for quiz:",
      quizId
    );

    return (
      <AppShell
        role={learningRole}
        userName={profile.full_name}
        userEmail={profile.email}
      >
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Unable to load assessment
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              We couldn&apos;t verify your training
              access right now. Please try again in a
              moment. If the problem continues,
              contact your trainer.
            </p>

            <Link
              href="/learn"
              className="mt-6 inline-flex rounded-[10px] bg-[var(--teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)]"
            >
              Back to training
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // VERIFY QUIZ BELONGS TO THE ASSIGNED WAVE
  //
  // A quiz may belong to:
  // 1. A module.
  // 2. A checkpoint.
  //
  // Resolve the associated day before loading quiz
  // questions or starting an attempt.
  // ---------------------------------------------------------

  const {
    data: quizAccessRecord,
    error: quizAccessError,
  } = await supabase
    .from("quizzes")
    .select("id, module_id, is_published")
    .eq("id", quizId)
    .maybeSingle();

  if (
    quizAccessError ||
    !quizAccessRecord ||
    !quizAccessRecord.is_published
  ) {
    notFound();
  }

  let verifiedDayId: string | null = null;

  // ---------------------------------------------------------
  // MODULE QUIZ ACCESS
  // ---------------------------------------------------------

  if (quizAccessRecord.module_id) {
    const {
      data: moduleAccess,
      error: moduleAccessError,
    } = await supabase
      .from("modules")
      .select("day_id")
      .eq("id", quizAccessRecord.module_id)
      .maybeSingle();

    if (moduleAccessError || !moduleAccess) {
      notFound();
    }

    verifiedDayId = moduleAccess.day_id;
  }

  // ---------------------------------------------------------
  // CHECKPOINT QUIZ ACCESS
  // ---------------------------------------------------------

  else {
    const {
      data: checkpointAccess,
      error: checkpointAccessError,
    } = await supabase
      .from("checkpoints")
      .select("day_id")
      .eq("quiz_id", quizId)
      .maybeSingle();

    if (
      checkpointAccessError ||
      !checkpointAccess
    ) {
      notFound();
    }

    verifiedDayId = checkpointAccess.day_id;
  }

  if (!verifiedDayId) {
    notFound();
  }

  // ---------------------------------------------------------
  // VERIFY DAY BELONGS TO THE ASSIGNED PROGRAM
  // ---------------------------------------------------------

  const {
    data: assignedDay,
    error: assignedDayError,
  } = await supabase
    .from("days")
    .select("id")
    .eq("id", verifiedDayId)
    .eq("program_id", programId)
    .eq("is_published", true)
    .maybeSingle();

  if (assignedDayError || !assignedDay) {
    notFound();
  }

  // ---------------------------------------------------------
  // VERIFY DAY EXISTS IN THE LEARNER'S JOURNEY
  // ---------------------------------------------------------

  const journeyDay = learnerJourney.days.find(
    (day) => day.id === verifiedDayId
  );

  if (!journeyDay) {
    notFound();
  }

  // ---------------------------------------------------------
  // LOAD LEARNER-SAFE QUIZ
  //
  // This only runs after wave access has been verified.
  // ---------------------------------------------------------

  let quiz: Awaited<
    ReturnType<typeof getLearnerQuiz>
  > = null;

  try {
    quiz = await getLearnerQuiz(quizId);
  } catch (quizLoadError) {
    console.error(
      "Unable to load learner assessment:",
      quizLoadError
    );

    return (
      <AppShell
        role={learningRole}
        userName={profile.full_name}
        userEmail={profile.email}
        learnerJourney={learnerJourney}
      >
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Unable to load assessment
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              We couldn&apos;t load this assessment
              right now. Please try again in a moment.
              If the problem continues, contact your
              trainer.
            </p>

            <Link
              href="/learn"
              className="mt-6 inline-flex rounded-[10px] bg-[var(--teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)]"
            >
              Back to training
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!quiz) {
    notFound();
  }

  // ---------------------------------------------------------
  // DETERMINE ASSESSMENT SOURCE
  //
  // Normal quiz:
  // quiz -> module -> day
  //
  // Checkpoint:
  // quiz -> checkpoint -> day
  // ---------------------------------------------------------

  let dayId: string | null = null;
  let moduleTitle: string | null = null;

  let isCheckpoint = false;
  let checkpointId: string | null = null;
  let checkpointTitle: string | null = null;
  let checkpointType: string | null = null;
  let checkpointPosition: number | null = null;

  // ---------------------------------------------------------
  // NORMAL MODULE QUIZ
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // CHECKPOINT QUIZ
  // ---------------------------------------------------------

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
    checkpointType = checkpoint.checkpoint_type;
    checkpointPosition = checkpoint.position;
  }

  if (!dayId) {
    notFound();
  }

  // ---------------------------------------------------------
  // CONSISTENCY CHECK
  //
  // Ensure the quiz still resolves to the verified day.
  // ---------------------------------------------------------

  if (dayId !== verifiedDayId) {
    notFound();
  }

  // ---------------------------------------------------------
  // CHECK DAY ACCESS
  //
  // Preserve the existing publication/access logic.
  // ---------------------------------------------------------

  const {
    data: unlocked,
    error: unlockError,
  } = await supabase.rpc("is_day_unlocked", {
    target_day_id: dayId,
  });

  if (unlockError || !unlocked) {
    if (unlockError) {
      console.error(
        "Unable to check day access:",
        unlockError
      );
    }

    return (
      <AppShell
        role={learningRole}
        userName={profile.full_name}
        userEmail={profile.email}
        learnerJourney={learnerJourney}
      >
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              {unlockError
                ? "Unable to load assessment"
                : "Assessment unavailable"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              {unlockError
                ? "We couldn't verify access to this assessment. Please try again in a moment."
                : "This assessment is not currently available. Please contact your trainer if you believe this is a mistake."}
            </p>

            <Link
              href={`/learn/day/${dayId}`}
              className="mt-6 inline-flex rounded-[10px] bg-[var(--teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)]"
            >
              Back to training
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // LOAD CHECKPOINT RESULT
  //
  // checkpoint_results uses:
  // pending / needs_review / completed
  // ---------------------------------------------------------

  let checkpointResult: CheckpointResult | null = null;

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
      .eq("checkpoint_id", checkpointId)
      .eq("learner_id", user.id)
      .maybeSingle();

    if (checkpointResultError) {
      console.error(
        "Unable to load checkpoint result:",
        checkpointResultError
      );
    }

    checkpointResult =
      (result as CheckpointResult | null) ?? null;
  }

  // ---------------------------------------------------------
  // COMPLETED CHECKPOINT
  // ---------------------------------------------------------

  if (
    isCheckpoint &&
    checkpointResult?.status === "completed"
  ) {
    return (
      <AppShell
        role={learningRole}
        userName={profile.full_name}
        userEmail={profile.email}
        learnerJourney={learnerJourney}
      >
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            href={`/learn/day/${dayId}`}
            className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            ← Back to training
          </Link>

          <div className="mt-8 rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--purple-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--purple)]">
                Checkpoint{" "}
                {checkpointPosition !== null
                  ? checkpointPosition + 1
                  : ""}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  checkpointResult.passed === true
                    ? "bg-[var(--success-soft)] text-[var(--success)]"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {checkpointResult.passed === true
                  ? "Passed"
                  : "Not passed"}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              {checkpointTitle ?? quiz.title}
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              This checkpoint has been completed and graded.
            </p>

            {checkpointResult.score !== null && (
              <div className="mt-6 rounded-[var(--radius-md)] bg-[var(--surface-soft)] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Final score
                </p>

                <p className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
                  {Number(checkpointResult.score).toFixed(0)}%
                </p>
              </div>
            )}

            {checkpointResult.trainer_feedback && (
              <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Trainer feedback
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {checkpointResult.trainer_feedback}
                </p>
              </div>
            )}

            <div className="mt-6">
              <Link
                href={`/learn/day/${dayId}`}
                className="inline-flex rounded-[10px] bg-[var(--teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)]"
              >
                Return to training
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // CHECKPOINT WAITING FOR TRAINER REVIEW
  // ---------------------------------------------------------

  if (
    isCheckpoint &&
    checkpointResult?.status === "needs_review"
  ) {
    return (
      <AppShell
        role={learningRole}
        userName={profile.full_name}
        userEmail={profile.email}
        learnerJourney={learnerJourney}
      >
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            href={`/learn/day/${dayId}`}
            className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            ← Back to training
          </Link>

          <div className="mt-8 rounded-[var(--radius-xl)] border border-amber-200 bg-white p-8 shadow-[var(--shadow-sm)]">
            <span className="inline-flex rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-semibold text-[var(--warning)]">
              Pending review
            </span>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              {checkpointTitle ?? quiz.title}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Your checkpoint has been submitted and is waiting
              for trainer review. Your final score and feedback
              will appear once the review is complete.
            </p>

            <div className="mt-6">
              <Link
                href={`/learn/day/${dayId}`}
                className="inline-flex rounded-[10px] bg-[var(--teal)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--teal-deep)]"
              >
                Return to training
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // START / RESUME ATTEMPT
  // ---------------------------------------------------------

  const {
    data: attemptId,
    error: attemptError,
  } = await supabase.rpc("start_quiz_attempt", {
    target_quiz_id: quiz.id,
  });

  if (attemptError || !attemptId) {
    const message =
      attemptError?.message ??
      "Unable to start this assessment.";

    return (
      <AppShell
        role={learningRole}
        userName={profile.full_name}
        userEmail={profile.email}
        learnerJourney={learnerJourney}
      >
        <div className="mx-auto max-w-4xl px-6 py-10">
          <Link
            href={`/learn/day/${dayId}`}
            className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            ← Back to training
          </Link>

          <div className="mt-8 rounded-[var(--radius-xl)] border border-[var(--border)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Assessment unavailable
            </h1>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {message}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // RENDER ACTIVE ASSESSMENT
  // ---------------------------------------------------------

  return (
    <AppShell
      role={learningRole}
      userName={profile.full_name}
      userEmail={profile.email}
      learnerJourney={learnerJourney}
    >
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href={`/learn/day/${dayId}`}
          className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← Back to training
        </Link>

        <header className="mb-8 mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {isCheckpoint ? (
              <>
                <span className="rounded-full bg-[var(--purple-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--purple)]">
                  Checkpoint{" "}
                  {checkpointPosition !== null
                    ? checkpointPosition + 1
                    : ""}
                </span>

                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  {checkpointTypeLabel(checkpointType)}
                </span>
              </>
            ) : (
              <span className="rounded-full bg-[var(--purple-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--purple)]">
                Knowledge Check
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {isCheckpoint
              ? checkpointTitle ?? quiz.title
              : quiz.title}
          </h1>

          {quiz.description && (
            <p className="mt-3 leading-7 text-[var(--text-secondary)]">
              {quiz.description}
            </p>
          )}

          {!isCheckpoint && moduleTitle && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {moduleTitle}
            </p>
          )}

          {quiz.instructions && (
            <div className="mt-5 rounded-[var(--radius-md)] border border-blue-100 bg-[var(--blue-soft)] p-4 text-sm leading-6 text-[var(--text-primary)]">
              {quiz.instructions}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              Passing score: {quiz.passing_score}%
            </span>

            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              Max attempts: {quiz.max_attempts}
            </span>

            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              {quiz.questions.length}{" "}
              {quiz.questions.length === 1
                ? "question"
                : "questions"}
            </span>
          </div>
        </header>

        <QuizPlayer
          quiz={quiz}
          attemptId={attemptId}
          dayId={dayId}
        />
      </div>
    </AppShell>
  );
}