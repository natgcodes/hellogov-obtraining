import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import QuizPlayer from "@/components/quizzes/QuizPlayer";
import { createClient } from "@/lib/supabase/server";
import { getLearnerQuiz } from "@/lib/quizzes/getLearnerQuiz";

type Props = {
  params: Promise<{
    quizId: string;
  }>;
};

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
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "trainer") {
    redirect("/trainer");
  }

  // ---------------------------------------------------------
  // LOAD LEARNER-SAFE QUIZ
  // ---------------------------------------------------------

  const quiz = await getLearnerQuiz(quizId);

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
  let checkpointTitle: string | null = null;
  let checkpointType: string | null = null;
  let checkpointPosition: number | null = null;

  // ---------------------------------------------------------
  // NORMAL MODULE QUIZ
  // ---------------------------------------------------------

  if (quiz.module_id) {
    const { data: module, error: moduleError } =
      await supabase
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
    }

    if (!checkpoint) {
      notFound();
    }

    isCheckpoint = true;

    dayId = checkpoint.day_id;
    checkpointTitle = checkpoint.title;
    checkpointType = checkpoint.checkpoint_type;
    checkpointPosition = checkpoint.position;
  }

  if (!dayId) {
    notFound();
  }

  // ---------------------------------------------------------
  // CHECK DAY ACCESS
  // ---------------------------------------------------------

  const {
    data: unlocked,
    error: unlockError,
  } = await supabase.rpc(
    "is_day_unlocked",
    {
      target_day_id: dayId,
    }
  );

  if (unlockError) {
    console.error(
      "Unable to check day access:",
      unlockError
    );

    redirect("/learn");
  }

  if (!unlocked) {
    redirect("/learn");
  }

  // ---------------------------------------------------------
  // START / RESUME ATTEMPT
  // ---------------------------------------------------------

  const {
    data: attemptId,
    error: attemptError,
  } = await supabase.rpc(
    "start_quiz_attempt",
    {
      target_quiz_id: quiz.id,
    }
  );

  if (attemptError || !attemptId) {
    const message =
      attemptError?.message ??
      "Unable to start this assessment.";

    return (
      <AppShell
        role="learner"
        userName={profile.full_name}
        userEmail={profile.email}
      >
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/learn/day/${dayId}`}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← Back to training
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-950">
              Assessment unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {message}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // LABELS
  // ---------------------------------------------------------

  function checkpointTypeLabel(
    type: string | null
  ) {
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

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <AppShell
      role="learner"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/learn/day/${dayId}`}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to training
        </Link>

        <header className="mb-8 mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {isCheckpoint ? (
              <>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                  Checkpoint{" "}
                  {checkpointPosition !== null
                    ? checkpointPosition + 1
                    : ""}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {checkpointTypeLabel(
                    checkpointType
                  )}
                </span>
              </>
            ) : (
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700">
                Knowledge Check
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {isCheckpoint
              ? checkpointTitle ?? quiz.title
              : quiz.title}
          </h1>

          {quiz.description && (
            <p className="mt-3 leading-7 text-slate-500">
              {quiz.description}
            </p>
          )}

          {!isCheckpoint && moduleTitle && (
            <p className="mt-2 text-sm text-slate-400">
              {moduleTitle}
            </p>
          )}

          {quiz.instructions && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
              {quiz.instructions}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Passing score: {quiz.passing_score}%
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Max attempts: {quiz.max_attempts}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
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