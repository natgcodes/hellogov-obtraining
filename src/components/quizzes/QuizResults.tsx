import Link from "next/link";
import type { QuizSubmissionResult } from "@/lib/quizzes/types";

type Props = {
  result: QuizSubmissionResult;
  passingScore: number;
  showResults: boolean;
  dayId?: string;
  isCheckpoint?: boolean;
};

export default function QuizResults({
  result,
  passingScore,
  showResults,
  dayId,
  isCheckpoint = false,
}: Props) {
  const needsReview =
    result.status === "needs_review";

  const assessmentLabel = isCheckpoint
    ? "checkpoint"
    : "quiz";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {needsReview ? (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-600">
            ◷
          </div>

          <h2 className="mt-4 text-2xl font-semibold text-slate-950">
            Submitted for review
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-slate-500">
            Your {assessmentLabel} contains answers
            that need to be reviewed by a trainer.
            Your final result will be available after
            the review is completed.
          </p>

          {showResults && (
            <div className="mt-5">
              <p className="text-sm text-slate-500">
                Automatically graded portion
              </p>

              <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                {Number(result.score).toFixed(2)}%
              </div>

              <p className="mt-2 text-xs text-slate-400">
                This is not your final score.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              result.passed
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {result.passed ? "✓" : "×"}
          </div>

          <h2 className="mt-4 text-2xl font-semibold text-slate-950">
            {result.passed
              ? isCheckpoint
                ? "Checkpoint passed"
                : "Quiz passed"
              : isCheckpoint
                ? "Checkpoint not passed"
                : "Quiz not passed"}
          </h2>

          {showResults && (
            <div className="mt-5">
              <div className="text-4xl font-semibold tracking-tight text-slate-950">
                {Number(result.score).toFixed(2)}%
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Passing score: {passingScore}%
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-7">
        <Link
          href={
            dayId
              ? `/learn/day/${dayId}`
              : "/learn"
          }
          className="inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {dayId
            ? "Back to training day"
            : "Continue training"}
        </Link>
      </div>
    </div>
  );
}