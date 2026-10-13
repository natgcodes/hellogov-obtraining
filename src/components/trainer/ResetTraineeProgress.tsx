"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  learnerId: string;
  programId: string;
  traineeName: string;
};

export default function ResetTraineeProgress({
  learnerId,
  programId,
  traineeName,
}: Props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canReset = confirmation === "RESET" && !isResetting;

  function openModal() {
    setConfirmation("");
    setError(null);
    setSuccess(false);
    setIsOpen(true);
  }

  function closeModal() {
    if (isResetting) return;

    setIsOpen(false);
    setConfirmation("");
    setError(null);
  }

  async function handleReset() {
    if (!canReset) return;

    setIsResetting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: resetError } = await supabase.rpc(
        "trainer_reset_learner_progress",
        {
          target_learner_id: learnerId,
          target_program_id: programId,
        }
      );

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
      setConfirmation("");

      router.refresh();
    } catch (resetError) {
      console.error(
        "Unable to reset trainee progress:",
        resetError
      );

      setError(
        resetError instanceof Error
          ? resetError.message
          : "The trainee's progress could not be reset."
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <>
      {/* DANGER ZONE */}

      <section className="mt-6 overflow-hidden rounded-[18px] border border-red-200 bg-white shadow-[var(--shadow-xs)]">
        <div className="border-b border-red-100 bg-red-50/60 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
              <WarningIcon />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-red-600">
                Danger Zone
              </p>

              <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-red-950">
                Reset trainee progress
              </h2>

              <p className="mt-1.5 max-w-3xl text-[12px] leading-5 text-red-800/80">
                Emergency action only. Resetting this trainee will
                permanently delete all of their onboarding progress
                for this program.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="max-w-3xl">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              Permanently erase onboarding progress
            </p>

            <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-muted)]">
              This removes completed setup items, materials,
              activities, module progress, quiz attempts and scores,
              checkpoint results, and certification progress. The
              trainee&apos;s account, profile, enrollment, notes, and
              questions will remain intact.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[10px] border border-red-600 bg-white px-4 text-[11px] font-semibold text-red-700 transition hover:bg-red-50"
          >
            Reset user progress
          </button>
        </div>

        {success && (
          <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-3 sm:px-6">
            <p className="text-[11px] font-medium text-emerald-700">
              {traineeName}&apos;s onboarding progress was successfully
              reset.
            </p>
          </div>
        )}
      </section>

      {/* CONFIRMATION MODAL */}

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101828]/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-progress-title"
            className="w-full max-w-[520px] overflow-hidden rounded-[20px] border border-red-200 bg-white shadow-2xl"
          >
            {/* MODAL HEADER */}

            <div className="border-b border-red-100 bg-red-50 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                    <WarningIcon />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-red-600">
                      Permanent action
                    </p>

                    <h2
                      id="reset-progress-title"
                      className="mt-1 text-[18px] font-semibold tracking-[-0.025em] text-red-950"
                    >
                      Reset all progress?
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isResetting}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* MODAL BODY */}

            <div className="px-5 py-5 sm:px-6">
              <div className="rounded-[12px] border border-red-200 bg-red-50/70 p-4">
                <p className="text-[13px] font-semibold leading-5 text-red-900">
                  This action cannot be undone.
                </p>

                <p className="mt-2 text-[12px] leading-5 text-red-800">
                  All onboarding progress for{" "}
                  <strong>{traineeName}</strong> will be permanently
                  deleted.
                </p>
              </div>

              <div className="mt-5">
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                  The following training data will be erased:
                </p>

                <ul className="mt-3 space-y-2 text-[11px] text-[var(--text-secondary)]">
                  <DangerItem>
                    Tool Setup completion
                  </DangerItem>

                  <DangerItem>
                    Materials, activities, and module progress
                  </DangerItem>

                  <DangerItem>
                    Quiz attempts, answers, scores, and pass/fail
                    results
                  </DangerItem>

                  <DangerItem>
                    Checkpoint results
                  </DangerItem>

                  <DangerItem>
                    Certification progress and results
                  </DangerItem>

                  <DangerItem>
                    Overall onboarding progress and completion status
                  </DangerItem>
                </ul>
              </div>

              <div className="mt-5 rounded-[12px] border border-[var(--border)] bg-[#F9FAFB] p-4">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">
                  Their account, profile, email, Team Lead, enrollment,
                  notes, and submitted questions will not be deleted.
                </p>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="reset-confirmation"
                  className="block text-[12px] font-semibold text-[var(--text-primary)]"
                >
                  Type{" "}
                  <span className="font-bold text-red-700">
                    RESET
                  </span>{" "}
                  to confirm
                </label>

                <input
                  id="reset-confirmation"
                  type="text"
                  value={confirmation}
                  onChange={(event) => {
                    setConfirmation(event.target.value);
                    setError(null);
                  }}
                  disabled={isResetting}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="RESET"
                  className="mt-2 h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3.5 text-[13px] font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-[#F9FAFB]"
                />
              </div>

              {error && (
                <div className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3">
                  <p className="text-[11px] font-medium leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* MODAL ACTIONS */}

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-soft)] bg-[#FCFCFD] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={isResetting}
                className="inline-flex min-h-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-white px-4 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={!canReset}
                className="inline-flex min-h-10 items-center justify-center rounded-[10px] bg-red-600 px-4 text-[11px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-200 disabled:text-red-500"
              >
                {isResetting
                  ? "Resetting progress..."
                  : "Reset all progress"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DangerItem({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"
      />

      <span>{children}</span>
    </li>
  );
}

function WarningIcon() {
  return (
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
      <path d="M10.3 3.6 2.4 17.2A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.8L13.7 3.6a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}