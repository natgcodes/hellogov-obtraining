"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  quizId: string;
  completed: boolean;
};

export default function QuizCompletionButton({
  quizId,
  completed,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleConfirm() {
    if (completed || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: completionError } =
      await supabase.rpc(
        "mark_quiz_completed",
        {
          target_quiz_id: quizId,
        }
      );

    if (completionError) {
      setError(completionError.message);
      setIsLoading(false);
      return;
    }

    setShowConfirmation(false);
    setIsLoading(false);

    router.refresh();
  }

  if (completed) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-[9px] border border-[var(--success)] bg-[var(--success-soft)] px-4 py-2.5 text-[12px] font-semibold text-[var(--success)]">
        ✓ Completed
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setShowConfirmation(true);
        }}
        className="inline-flex shrink-0 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-4 py-2.5 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--teal-border)] hover:text-[var(--teal-deep)]"
      >
        Mark as completed
      </button>

      {showConfirmation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowConfirmation(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`quiz-confirmation-${quizId}`}
            className="w-full max-w-[440px] rounded-[18px] border border-[var(--border)] bg-white p-6 shadow-xl"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--teal-soft)] text-[18px] font-semibold text-[var(--teal-deep)]">
              ✓
            </div>

            <h3
              id={`quiz-confirmation-${quizId}`}
              className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
            >
              Mark quiz as completed?
            </h3>

            <p className="mt-2 text-[13px] leading-6 text-[var(--text-secondary)]">
              By marking this quiz as
              completed, you confirm that
              you have already completed
              it. Are you sure you want to
              continue?
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
                onClick={() => {
                  setShowConfirmation(false);
                  setError(null);
                }}
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
                  ? "Marking..."
                  : "Yes, mark as completed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}