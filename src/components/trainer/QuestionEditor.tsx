"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import QuizQuestionBuilder, {
  MatchingPair,
  QuizOption,
} from "@/components/trainer/QuizQuestionBuilder";

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  instructions: string | null;
  points: number;
  position: number;
  is_required: boolean;
  allow_partial_credit: boolean;
  quiz_options: QuizOption[];
  quiz_matching_pairs: MatchingPair[];
};

type Props = {
  question?: QuizQuestion;
  quizId: string;
  nextPosition?: number;
  onClose: () => void;
};

const questionTypes = [
  ["single_choice", "Single Choice"],
  ["multiple_choice", "Multiple Choice"],
  ["true_false", "True / False"],
  ["matching", "Matching"],
  ["match_cards", "Match Cards"],
  ["open_text", "Open Text"],
  ["file_upload", "File Upload"],
];

export default function QuestionEditor({
  question,
  quizId,
  nextPosition = 1,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [questionText, setQuestionText] = useState(
    question?.question_text ?? ""
  );
  const [questionType, setQuestionType] = useState(
    question?.question_type ?? "single_choice"
  );
  const [instructions, setInstructions] = useState(
    question?.instructions ?? ""
  );
  const [points, setPoints] = useState(
    String(question?.points ?? 1)
  );
  const [isRequired, setIsRequired] = useState(
    question?.is_required ?? true
  );
  const [allowPartialCredit, setAllowPartialCredit] =
    useState(question?.allow_partial_credit ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const cleanQuestion = questionText.trim();
    const numericPoints = Number(points);

    if (!cleanQuestion) {
      setError("Question text is required.");
      return;
    }

    if (
      Number.isNaN(numericPoints) ||
      numericPoints < 0
    ) {
      setError("Points must be 0 or greater.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      question_text: cleanQuestion,
      question_type: questionType,
      instructions: instructions.trim() || null,
      points: numericPoints,
      is_required: isRequired,
      allow_partial_credit:
        questionType === "matching" ||
        questionType === "match_cards" ||
        questionType === "multiple_choice"
          ? allowPartialCredit
          : false,
    };

    if (question) {
      const { error: updateError } = await supabase
        .from("quiz_questions")
        .update(payload)
        .eq("id", question.id);

      if (updateError) {
        console.error(updateError);
        setError("Could not update the question.");
        setIsSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("quiz_questions")
        .insert({
          ...payload,
          quiz_id: quizId,
          position: nextPosition,
        });

      if (insertError) {
        console.error(insertError);
        setError("Could not create the question.");
        setIsSaving(false);
        return;
      }
    }

    router.refresh();
    onClose();
  }

  async function handleDelete() {
    if (!question) return;

    if (
      !window.confirm(
        "Delete this question and all of its answers?"
      )
    ) {
      return;
    }

    setIsSaving(true);

    const { error: deleteError } = await supabase
      .from("quiz_questions")
      .delete()
      .eq("id", question.id);

    if (deleteError) {
      console.error(deleteError);
      setError("Could not delete the question.");
      setIsSaving(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/25">
      <div className="h-full w-full max-w-[720px] overflow-y-auto border-l border-[#e5e7eb] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#eaecf0] bg-white/95 px-7 py-5 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6847df]">
              Quiz question
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[#172033]">
              {question ? "Edit question" : "Add question"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] text-lg text-[#667085]"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-7"
        >
          <div>
            <label className="text-sm font-medium text-[#344054]">
              Question
            </label>

            <textarea
              value={questionText}
              onChange={(event) =>
                setQuestionText(event.target.value)
              }
              rows={3}
              placeholder="Enter the question..."
              className="mt-2 w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none focus:border-[#7c5cff]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-[#344054]">
                Question type
              </label>

              <select
                value={questionType}
                onChange={(event) =>
                  setQuestionType(event.target.value)
                }
                disabled={Boolean(question)}
                className="mt-2 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm outline-none"
              >
                {questionTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {question && (
                <p className="mt-1.5 text-xs text-[#98a2b3]">
                  Question type cannot be changed after creation.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-[#344054]">
                Points
              </label>

              <input
                type="number"
                min="0"
                step="0.25"
                value={points}
                onChange={(event) =>
                  setPoints(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#344054]">
              Instructions
            </label>

            <textarea
              value={instructions}
              onChange={(event) =>
                setInstructions(event.target.value)
              }
              rows={2}
              placeholder="Optional instructions for this question."
              className="mt-2 w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="space-y-3 rounded-xl bg-[#f9fafb] p-4">
            <label className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#344054]">
                  Required question
                </p>
              </div>

              <input
                type="checkbox"
                checked={isRequired}
                onChange={(event) =>
                  setIsRequired(event.target.checked)
                }
              />
            </label>

            {[
              "multiple_choice",
              "matching",
              "match_cards",
            ].includes(questionType) && (
              <label className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#344054]">
                    Allow partial credit
                  </p>

                  <p className="text-xs text-[#98a2b3]">
                    Award points for partially correct answers.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={allowPartialCredit}
                  onChange={(event) =>
                    setAllowPartialCredit(
                      event.target.checked
                    )
                  }
                />
              </label>
            )}
          </div>

          {question && (
            <div>
              <div className="mb-3">
                <p className="text-sm font-semibold text-[#344054]">
                  Answer configuration
                </p>

                <p className="mt-1 text-xs text-[#98a2b3]">
                  Configure the correct answer or matching pairs.
                </p>
              </div>

              <QuizQuestionBuilder
                questionId={question.id}
                questionType={question.question_type}
                options={question.quiz_options ?? []}
                matchingPairs={
                  question.quiz_matching_pairs ?? []
                }
              />
            </div>
          )}

          {!question && (
            <div className="rounded-xl border border-[#d9d6fe] bg-[#f4f3ff] px-4 py-3">
              <p className="text-xs leading-5 text-[#5925dc]">
                Create the question first. Then open it again to
                configure its answers or matching pairs.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
              {error}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 border-t border-[#eaecf0] pt-5">
            <div>
              {question && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#b42318] hover:bg-[#fef3f2]"
                >
                  Delete question
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#d0d5dd] px-4 py-2.5 text-sm font-semibold text-[#475467]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : question
                    ? "Save question"
                    : "Create question"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}