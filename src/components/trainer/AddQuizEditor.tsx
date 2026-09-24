"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  moduleId: string;
  nextPosition: number;
  onClose: () => void;
};

export default function AddQuizEditor({
  moduleId,
  nextPosition,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [passingScore, setPassingScore] = useState("80");
  const [maxAttempts, setMaxAttempts] = useState("1");
  const [isRequired, setIsRequired] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] =
    useState(false);
  const [showResults, setShowResults] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const cleanTitle = title.trim();
    const score = Number(passingScore);
    const attempts = Number(maxAttempts);

    if (!cleanTitle) {
      setError("Quiz title is required.");
      return;
    }

    if (
      Number.isNaN(score) ||
      score < 0 ||
      score > 100
    ) {
      setError(
        "Passing score must be between 0 and 100."
      );
      return;
    }

    if (
      !Number.isInteger(attempts) ||
      attempts < 1
    ) {
      setError(
        "Maximum attempts must be at least 1."
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("quizzes")
      .insert({
        module_id: moduleId,
        title: cleanTitle,
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        passing_score: score,
        max_attempts: attempts,
        position: nextPosition,
        is_required: isRequired,
        is_published: isPublished,
        shuffle_questions: shuffleQuestions,
        show_results: showResults,
      });

    if (insertError) {
      console.error("Error creating quiz:", insertError);
      setError(
        "We couldn't create the quiz. Please try again."
      );
      setIsSaving(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[22px] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#eaecf0] bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6847df]">
              Quiz
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[#172033]">
              Add quiz
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085] hover:bg-[#f7f8fa]"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          <div>
            <label className="text-sm font-medium text-[#344054]">
              Quiz title
            </label>

            <input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Passport Basics Knowledge Check"
              className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c5cff]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#344054]">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c5cff]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#344054]">
              Learner instructions
            </label>

            <textarea
              value={instructions}
              onChange={(event) =>
                setInstructions(event.target.value)
              }
              rows={3}
              placeholder="Instructions shown before the learner starts."
              className="mt-2 w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c5cff]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#344054]">
                Passing score
              </label>

              <div className="relative mt-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(event) =>
                    setPassingScore(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 pr-9 text-sm outline-none focus:border-[#7c5cff]"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#98a2b3]">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#344054]">
                Maximum attempts
              </label>

              <input
                type="number"
                min="1"
                value={maxAttempts}
                onChange={(event) =>
                  setMaxAttempts(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c5cff]"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl bg-[#f9fafb] p-4">
            <label className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#344054]">
                  Required
                </p>
                <p className="text-xs text-[#98a2b3]">
                  Learners must complete this quiz.
                </p>
              </div>

              <input
                type="checkbox"
                checked={isRequired}
                onChange={(event) =>
                  setIsRequired(event.target.checked)
                }
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#344054]">
                  Shuffle questions
                </p>
                <p className="text-xs text-[#98a2b3]">
                  Change question order between attempts.
                </p>
              </div>

              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(event) =>
                  setShuffleQuestions(event.target.checked)
                }
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#344054]">
                  Show results
                </p>
                <p className="text-xs text-[#98a2b3]">
                  Show the learner their result after grading.
                </p>
              </div>

              <input
                type="checkbox"
                checked={showResults}
                onChange={(event) =>
                  setShowResults(event.target.checked)
                }
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#344054]">
                  Published
                </p>
                <p className="text-xs text-[#98a2b3]">
                  Make this quiz available when its program is
                  published.
                </p>
              </div>

              <input
                type="checkbox"
                checked={isPublished}
                onChange={(event) =>
                  setIsPublished(event.target.checked)
                }
                className="h-4 w-4"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-[#eaecf0] pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-[#d0d5dd] px-4 py-2.5 text-sm font-semibold text-[#475467]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Create quiz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}