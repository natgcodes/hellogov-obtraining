import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ManualAnswerGrader from "@/components/trainer/ManualAnswerGrader";
import FinalizeReviewButton from "@/components/trainer/FinalizeReviewButton";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    attemptId: string;
  }>;
};

type SubmissionRow = {
  answer_id: string;
  question_id: string;
  question_position: number;
  question_text: string;
  question_type: string;
  question_points: number;
  answer_text: string | null;
  file_path: string | null;
  file_name: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  trainer_feedback: string | null;
  answer_graded_at: string | null;
  selected_option_text: string | null;
  match_left_text: string | null;
  match_right_text: string | null;
  match_position: number | null;
};

type GroupedAnswer = {
  answerId: string;
  questionId: string;
  position: number;
  question: string;
  questionType: string;
  maxPoints: number;
  answerText: string | null;
  filePath: string | null;
  fileName: string | null;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  trainerFeedback: string | null;
  gradedAt: string | null;
  selectedOptionText: string | null;

  selectedOptions: {
    text: string;
    position: number;
  }[];

  matches: {
    left: string;
    right: string;
    position: number;
  }[];
};

export default async function ReviewAttemptPage({
  params,
}: Props) {
  const { attemptId } = await params;

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

  if (profile?.role !== "trainer") {
    redirect("/learn");
  }

  // ----------------------------------------------------------
  // ATTEMPT INFORMATION
  // ----------------------------------------------------------

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select(`
      id,
      learner_id,
      score,
      passed,
      status,
      submitted_at,
      graded_at,

      quizzes (
        id,
        title,
        passing_score,
        module_id
      ),

      profiles!quiz_attempts_learner_id_fkey (
        full_name,
        email
      )
    `)
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) {
    notFound();
  }

  const quiz = Array.isArray(attempt.quizzes)
    ? attempt.quizzes[0]
    : attempt.quizzes;

  const learner = Array.isArray(attempt.profiles)
    ? attempt.profiles[0]
    : attempt.profiles;

  if (!quiz) {
    notFound();
  }

  // ----------------------------------------------------------
  // SUBMISSION DETAILS
  // ----------------------------------------------------------

  const { data: submissionData, error: submissionError } =
    await supabase.rpc("get_learner_submission_detail", {
      target_attempt_id: attemptId,
    });

  if (submissionError) {
    console.error(
      "Could not load submission details:",
      submissionError
    );
  }

  const rows = (submissionData ?? []) as SubmissionRow[];

  // ----------------------------------------------------------
  // GROUP MULTI-ROW ANSWERS
  //
  // Multiple choice and matching answers can return more than
  // one database row for the same quiz answer.
  // ----------------------------------------------------------

  const groupedMap = new Map<string, GroupedAnswer>();

  for (const row of rows) {
    let answer = groupedMap.get(row.answer_id);

    if (!answer) {
      answer = {
        answerId: row.answer_id,
        questionId: row.question_id,
        position: row.question_position,
        question: row.question_text,
        questionType: row.question_type,
        maxPoints: Number(row.question_points),
        answerText: row.answer_text,
        filePath: row.file_path,
        fileName: row.file_name,
        isCorrect: row.is_correct,
        pointsAwarded:
          row.points_awarded === null
            ? null
            : Number(row.points_awarded),
        trainerFeedback: row.trainer_feedback,
        gradedAt: row.answer_graded_at,
        selectedOptionText: row.selected_option_text,
        selectedOptions: [],
        matches: [],
      };

      groupedMap.set(row.answer_id, answer);
    }

    if (
      row.question_type === "multiple_choice" &&
      row.selected_option_text
    ) {
      const alreadyAdded = answer.selectedOptions.some(
        (option) =>
          option.text === row.selected_option_text &&
          option.position === Number(row.match_position ?? 0)
      );

      if (!alreadyAdded) {
        answer.selectedOptions.push({
          text: row.selected_option_text,
          position: Number(row.match_position ?? 0),
        });
      }
    }

    if (
      (row.question_type === "matching" ||
        row.question_type === "match_cards") &&
      row.match_left_text &&
      row.match_right_text
    ) {
      const alreadyAdded = answer.matches.some(
        (match) =>
          match.left === row.match_left_text &&
          match.right === row.match_right_text
      );

      if (!alreadyAdded) {
        answer.matches.push({
          left: row.match_left_text,
          right: row.match_right_text,
          position: Number(row.match_position ?? 0),
        });
      }
    }
  }

  const answers = Array.from(groupedMap.values())
    .map((answer) => ({
      ...answer,
      selectedOptions: [...answer.selectedOptions].sort(
        (a, b) => a.position - b.position
      ),
      matches: [...answer.matches].sort(
        (a, b) => a.position - b.position
      ),
    }))
    .sort((a, b) => a.position - b.position);

  const manualPendingCount = answers.filter(
    (answer) =>
      (answer.questionType === "open_text" ||
        answer.questionType === "file_upload") &&
      answer.pointsAwarded === null
  ).length;

  return (
    <AppShell role="trainer">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/trainer/review"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Review Center
        </Link>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
            Assessment Review
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {quiz.title}
          </h1>

          <p className="mt-2 text-slate-500">
            {learner?.full_name || "Learner"}
            {learner?.email ? ` · ${learner.email}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Current score:{" "}
              {Number(attempt.score ?? 0).toFixed(2)}%
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Passing score: {Number(quiz.passing_score)}%
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                attempt.status === "graded"
                  ? attempt.passed
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {attempt.status === "graded"
                ? attempt.passed
                  ? "Passed"
                  : "Not passed"
                : attempt.status.replaceAll("_", " ")}
            </span>

            {manualPendingCount > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {manualPendingCount} manual{" "}
                {manualPendingCount === 1
                  ? "answer"
                  : "answers"}{" "}
                pending
              </span>
            )}
          </div>
        </header>

        {submissionError && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load the learner&apos;s submitted answers.
          </div>
        )}

        {!submissionError && answers.length === 0 && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-900">
              No submitted answers found.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              This attempt does not contain any answers available for
              review.
            </p>
          </div>
        )}

        <div className="mt-8 space-y-5">
          {answers.map((answer, index) => (
            <ManualAnswerGrader
              key={answer.answerId}
              answerId={answer.answerId}
              questionNumber={index + 1}
              question={answer.question}
              questionType={answer.questionType}
              maxPoints={answer.maxPoints}
              answerText={answer.answerText}
              filePath={answer.filePath}
              fileName={answer.fileName}
              currentPoints={answer.pointsAwarded}
              currentFeedback={answer.trainerFeedback}
              isCorrect={answer.isCorrect}
              selectedOptionText={answer.selectedOptionText}
              selectedOptions={answer.selectedOptions}
              matches={answer.matches}
            />
          ))}
        </div>

        {answers.length > 0 && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Finalize assessment review
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Finalizing recalculates the learner&apos;s final
                  score, pass status, module progress, and program
                  progress.
                </p>
              </div>

              <FinalizeReviewButton
                attemptId={attempt.id}
                moduleId={quiz.module_id}
              />
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}