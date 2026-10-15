"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  quizId: string;
  completed: boolean;
  manuallyCompleted: boolean;
};

export default function QuizCompletionButton({
  quizId,
  completed,
  manuallyCompleted,
}: Props) {
  const router = useRouter();

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [localManuallyCompleted, setLocalManuallyCompleted] =
    useState(manuallyCompleted);

  // Keep the local state synchronized with server data.
  useEffect(() => {
    setLocalManuallyCompleted(manuallyCompleted);
  }, [manuallyCompleted]);

  // A quiz can be completed through either:
  // 1. Manual completion
  // 2. A passing graded attempt
  const academicallyCompleted =
    completed && !manuallyCompleted;

  const isCompleted =
    localManuallyCompleted || academicallyCompleted;

  const isMarkingIncomplete = localManuallyCompleted;

  function openConfirmation() {
    if (isLoading) {
      return;
    }

    setError(null);
    setShowConfirmation(true);
  }

  function closeConfirmation() {
    if (isLoading) {
      return;
    }

    setShowConfirmation(false);
    setError(null);
  }

  async function handleConfirm() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const targetCompleted = !localManuallyCompleted;

    const supabase = createClient();

    const { error: completionError } = await supabase.rpc(
      "set_quiz_manual_completion",
      {
        target_quiz_id: quizId,
        target_completed: targetCompleted,
      }
    );

    if (completionError) {
      setError(completionError.message);
      setIsLoading(false);
      return;
    }

    // Update the button immediately.
    setLocalManuallyCompleted(targetCompleted);

    setShowConfirmation(false);
    setIsLoading(false);

    // Refresh module, day, and journey progress.
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isCompleted && (
          <span className="inline-flex shrink-0 items-center justify-center rounded-[9px] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-2.5 text-[12px] font-semibold text-[var(--success)]">
            ✓ Completed
          </span>
        )}

        {localManuallyCompleted ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={openConfirmation}
            className="inline-flex shrink-0 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-4 py-2.5 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--warning)] hover:text-[var(--warning)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark as incomplete
          </button>
        ) : !isCompleted ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={openConfirmation}
            className="inline-flex shrink-0 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-4 py-2.5 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--teal-border)] hover:text-[var(--teal-deep)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark as completed
          </button>
        ) : null}
      </div>

      {showConfirmation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConfirmation();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`quiz-confirmation-${quizId}`}
            className="w-full max-w-[440px] rounded-[18px] border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-[18px] font-semibold ${
                isMarkingIncomplete
                  ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                  : "bg-[var(--teal-soft)] text-[var(--teal-deep)]"
              }`}
            >
              {isMarkingIncomplete ? "↶" : "✓"}
            </div>

            <h3
              id={`quiz-confirmation-${quizId}`}
              className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
            >
              {isMarkingIncomplete
                ? "Mark quiz as incomplete?"
                : "Mark quiz as completed?"}
            </h3>

            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
              {isMarkingIncomplete
                ? "This will remove your manual completion for this quiz. Your previous attempts, answers, and scores will be preserved. If you have already passed the quiz, it will remain completed."
                : "By marking this quiz as completed, you confirm that you have already completed it. Are you sure you want to continue?"}
            </p>

            {error && (
              <div className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-[12px] leading-5 text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={closeConfirmation}
                className="inline-flex items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-4 py-2.5 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirm}
                className="inline-flex items-center justify-center rounded-[9px] bg-[var(--teal)] px-4 py-2.5 text-[12px] font-semibold !text-white transition hover:bg-[var(--teal-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading
                  ? "Saving..."
                  : isMarkingIncomplete
                    ? "Yes, mark as incomplete"
                    : "Yes, mark as completed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}