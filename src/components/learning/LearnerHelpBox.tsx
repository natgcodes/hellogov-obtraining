"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LearnerHelpBox() {
  const supabase = createClient();

  const [formOpen, setFormOpen] = useState(false);
  const [groupNumber, setGroupNumber] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanGroupNumber = groupNumber.trim();
    const cleanQuestion = question.trim();

    if (!cleanGroupNumber) {
      setError("Please enter your group number.");
      return;
    }

    if (!cleanQuestion) {
      setError("Please enter your question.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "We couldn't verify your account. Please sign in again."
        );
        return;
      }

      const { error: insertError } = await supabase
        .from("training_questions")
        .insert({
          learner_id: user.id,
          group_number: cleanGroupNumber,
          question: cleanQuestion,
        });

      if (insertError) {
        console.error(
          "Unable to submit training question:",
          insertError
        );

        setError(
          "We couldn't send your question. Please try again."
        );

        return;
      }

      setGroupNumber("");
      setQuestion("");
      setSuccess(true);
      setFormOpen(false);
    } catch (submitError) {
      console.error(
        "Unexpected error submitting training question:",
        submitError
      );

      setError(
        "We couldn't send your question. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openForm() {
    setSuccess(false);
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    if (submitting) {
      return;
    }

    setFormOpen(false);
    setError(null);
  }

  return (
    <>
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
        {/* HEADER */}

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--teal-soft)] text-[var(--teal-deep)]">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />

              <path d="M9.8 9a2.3 2.3 0 0 1 4.4 1c0 1.7-2.2 2-2.2 3.5" />

              <path d="M12 17h.01" />
            </svg>
          </div>

          <p className="text-[12px] font-semibold text-[var(--text-primary)]">
            Need help?
          </p>
        </div>

        {/* SLACK */}

        <div className="mt-3">
          <p className="text-[11px] font-semibold text-[var(--text-primary)]">
            Ask your trainer
          </p>

          <p className="mt-1 text-[10.5px] leading-[1.55] text-[var(--text-secondary)]">
            Go to Slack and ask your trainer in your training
            channel.
          </p>
        </div>

        {/* DIVIDER */}

        <div className="my-3 border-t border-[var(--border-soft)]" />

        {/* GENERAL Q&A */}

        <div>
          <p className="text-[11px] font-semibold text-[var(--text-primary)]">
            General Q&amp;A
          </p>

          <p className="mt-1 text-[10.5px] leading-[1.55] text-[var(--text-secondary)]">
            Have a general training question? Send it to the
            Training team.
          </p>

          <button
            type="button"
            onClick={openForm}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-[var(--teal-deep)] transition-colors hover:text-[var(--teal)]"
          >
            Ask a question
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* SUCCESS */}

        {success && (
          <div className="mt-3 rounded-[9px] bg-[var(--success-soft)] px-3 py-2.5">
            <p className="text-[10.5px] font-medium leading-4 text-[var(--success)]">
              Question sent to the Training team.
            </p>
          </div>
        )}
      </div>

      {/* =====================================================
          QUESTION MODAL
      ===================================================== */}

      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Close question form"
            onClick={closeForm}
            className="absolute inset-0 bg-[#102f38]/25 backdrop-blur-[2px]"
          />

          {/* MODAL */}

          <div className="relative z-10 w-full max-w-[500px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-lg)]">
            {/* MODAL HEADER */}

            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal-deep)]">
                  General Q&amp;A
                </p>

                <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Ask the Training Team
                </h2>

                <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
                  Your question will be visible to the HelloGov
                  trainers.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[18px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] disabled:opacity-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="px-5 py-5 sm:px-6"
            >
              {/* GROUP NUMBER */}

              <label
                htmlFor="training-group-number"
                className="text-[12px] font-semibold text-[var(--text-primary)]"
              >
                Group number{" "}
                <span className="text-red-500">*</span>
              </label>

              <p className="mt-1 text-[10.5px] leading-4 text-[var(--text-muted)]">
                Enter your onboarding group number so the
                Training team can identify your group.
              </p>

              <input
                id="training-group-number"
                type="text"
                value={groupNumber}
                onChange={(event) => {
                  setGroupNumber(event.target.value);

                  if (error) {
                    setError(null);
                  }
                }}
                disabled={submitting}
                maxLength={50}
                autoFocus
                required
                placeholder="Example: 3"
                className="mt-3 h-10 w-full rounded-[11px] border border-[var(--border)] bg-white px-3.5 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--teal)] focus:ring-4 focus:ring-[var(--teal-soft)] disabled:bg-[var(--surface-soft)]"
              />

              {/* QUESTION */}

              <div className="mt-5">
                <label
                  htmlFor="training-question"
                  className="text-[12px] font-semibold text-[var(--text-primary)]"
                >
                  Your question{" "}
                  <span className="text-red-500">*</span>
                </label>

                <p className="mt-1 text-[10.5px] leading-4 text-[var(--text-muted)]">
                  Use this space for general onboarding questions
                  that the Training team can help clarify.
                </p>

                <textarea
                  id="training-question"
                  value={question}
                  onChange={(event) => {
                    setQuestion(event.target.value);

                    if (error) {
                      setError(null);
                    }
                  }}
                  disabled={submitting}
                  rows={5}
                  maxLength={1500}
                  required
                  placeholder="Write your question here..."
                  className="mt-3 w-full resize-none rounded-[11px] border border-[var(--border)] bg-white px-3.5 py-3 text-[12px] leading-5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--teal)] focus:ring-4 focus:ring-[var(--teal-soft)] disabled:bg-[var(--surface-soft)]"
                />

                <div className="mt-1.5 flex justify-end">
                  <span className="text-[9.5px] text-[var(--text-muted)]">
                    {question.length}/1500
                  </span>
                </div>
              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-3 rounded-[9px] border border-red-100 bg-red-50 px-3 py-2.5">
                  <p className="text-[10.5px] leading-4 text-red-600">
                    {error}
                  </p>
                </div>
              )}

              {/* ACTIONS */}

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="inline-flex h-9 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-4 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !groupNumber.trim() ||
                    !question.trim()
                  }
                  className="inline-flex h-9 items-center justify-center rounded-[9px] bg-[#08A9C1] px-4 text-[11px] font-semibold !text-white transition-colors hover:bg-[#0795AA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Sending..."
                    : "Submit question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}