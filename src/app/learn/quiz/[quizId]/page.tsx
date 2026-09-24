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

  if (profile?.role === "trainer") {
    redirect("/trainer");
  }

  // Load the learner-safe quiz
  const quiz = await getLearnerQuiz(quizId);

  if (!quiz) {
    notFound();
  }

  // Find the module/day this quiz belongs to
  const { data: module } = await supabase
    .from("modules")
    .select(`
      id,
      title,
      day_id
    `)
    .eq("id", quiz.module_id)
    .single();

  if (!module) {
    notFound();
  }

  // Make sure the learner is allowed to access this day
  const { data: unlocked, error: unlockError } =
    await supabase.rpc("is_day_unlocked", {
      target_day_id: module.day_id,
    });

  if (unlockError || !unlocked) {
    redirect("/learn");
  }

  // Start or resume the learner's quiz attempt
  const { data: attemptId, error: attemptError } =
    await supabase.rpc("start_quiz_attempt", {
      target_quiz_id: quiz.id,
    });

  if (attemptError || !attemptId) {
    const message =
      attemptError?.message ??
      "Unable to start this quiz.";

    return (
      <AppShell role="learner">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/learn/day/${module.day_id}`}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← Back to training
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-950">
              Quiz unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {message}
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="learner">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/learn/day/${module.day_id}`}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to training
        </Link>

        <header className="mb-8 mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
            Knowledge Check
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {quiz.title}
          </h1>

          {quiz.description && (
            <p className="mt-3 leading-7 text-slate-500">
              {quiz.description}
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
          dayId={module.day_id}
        />
      </div>
    </AppShell>
  );
}