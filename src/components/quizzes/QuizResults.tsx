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
    <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
      <div className="px-6 py-8 text-center sm:px-8 sm:py-10">
        {needsReview ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[13px] bg-amber-50 text-amber-600">
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
                  cx="12"
                  cy="12"
                  r="9"
                />

                <path d="M12 7v5l3 2" />
              </svg>
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-600">
              Trainer review required
            </p>

            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Submitted for review
            </h2>

            <p className="mx-auto mt-2 max-w-[540px] text-[13px] leading-6 text-[var(--text-secondary)]">
              Your {assessmentLabel} contains
              answers that need to be reviewed by a
              trainer. Your final result will be
              available after the review is
              completed.
            </p>

            {showResults && (
              <div className="mx-auto mt-6 max-w-[280px] rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-4">
                <p className="text-[11px] font-medium text-[var(--text-muted)]">
                  Automatically graded portion
                </p>

                <div className="mt-1 text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {Number(
                    result.score
                  ).toFixed(2)}
                  %
                </div>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  This is not your final score.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-[13px] text-[18px] font-semibold ${
                result.passed
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {result.passed ? "✓" : "×"}
            </div>

            <p
              className={`mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                result.passed
                  ? "text-[var(--success)]"
                  : "text-red-600"
              }`}
            >
              {result.passed
                ? "Assessment complete"
                : "Passing score not reached"}
            </p>

            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
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
                <div className="text-[36px] font-semibold tracking-[-0.045em] text-[var(--text-primary)]">
                  {Number(
                    result.score
                  ).toFixed(2)}
                  %
                </div>

                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  Passing score: {passingScore}%
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-center border-t border-[var(--border-soft)] bg-[var(--surface-soft)]/50 px-5 py-4">
        <Link
          href={
            dayId
              ? `/learn/day/${dayId}`
              : "/learn"
          }
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#172033] px-4 text-[12px] font-semibold !text-white transition hover:bg-[#253047] hover:!text-white"
        >
          {dayId
            ? "Back to training day"
            : "Continue training"}

          <span aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}