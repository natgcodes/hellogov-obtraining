"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import QuestionEditor, {
  QuizQuestion,
} from "@/components/trainer/QuestionEditor";

export type Quiz = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  passing_score: number;
  max_attempts: number;
  position: number;
  is_required: boolean;
  is_published: boolean;
  shuffle_questions: boolean;
  show_results: boolean;
  quiz_questions: QuizQuestion[];
};

type Props = {
  quiz: Quiz;
  onClose: () => void;
};

const typeLabels: Record<string, string> = {
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  matching: "Matching",
  match_cards: "Match Cards",
  open_text: "Open Text",
  file_upload: "File Upload",
};

export default function QuizEditor({
  quiz,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(
    quiz.description ?? ""
  );
  const [instructions, setInstructions] = useState(
    quiz.instructions ?? ""
  );
  const [passingScore, setPassingScore] = useState(
    String(quiz.passing_score)
  );
  const [maxAttempts, setMaxAttempts] = useState(
    String(quiz.max_attempts)
  );
  const [isRequired, setIsRequired] = useState(
    quiz.is_required
  );
  const [isPublished, setIsPublished] = useState(
    quiz.is_published
  );
  const [shuffleQuestions, setShuffleQuestions] =
    useState(quiz.shuffle_questions);
  const [showResults, setShowResults] = useState(
    quiz.show_results
  );

  const [editingQuestion, setEditingQuestion] =
    useState<QuizQuestion | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] =
    useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReordering, setIsReordering] =
    useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  async function saveQuiz(event: FormEvent) {
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

    const { error: updateError } = await supabase
      .from("quizzes")
      .update({
        title: cleanTitle,
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        passing_score: score,
        max_attempts: attempts,
        is_required: isRequired,
        is_published: isPublished,
        shuffle_questions: shuffleQuestions,
        show_results: showResults,
      })
      .eq("id", quiz.id);

    if (updateError) {
      console.error(updateError);
      setError("Could not save the quiz.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.refresh();
  }

  async function deleteQuiz() {
    if (
      !window.confirm(
        "Delete this quiz and all of its questions?"
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quiz.id);

    if (deleteError) {
      console.error(deleteError);
      setError("Could not delete the quiz.");
      return;
    }

    router.refresh();
    onClose();
  }

  async function moveQuestion(
    index: number,
    direction: "up" | "down"
  ) {
    if (isReordering) return;

    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= quiz.quiz_questions.length
    ) {
      return;
    }

    const current = quiz.quiz_questions[index];
    const target = quiz.quiz_questions[targetIndex];

    setIsReordering(true);
    setError(null);

    const { error: tempCurrentError } = await supabase
      .from("quiz_questions")
      .update({ position: -500001 })
      .eq("id", current.id);

    if (tempCurrentError) {
      setError("Could not reorder questions.");
      setIsReordering(false);
      return;
    }

    const { error: tempTargetError } = await supabase
      .from("quiz_questions")
      .update({ position: -500002 })
      .eq("id", target.id);

    if (tempTargetError) {
      await supabase
        .from("quiz_questions")
        .update({ position: current.position })
        .eq("id", current.id);

      setError("Could not reorder questions.");
      setIsReordering(false);
      return;
    }

    const { error: currentError } = await supabase
      .from("quiz_questions")
      .update({ position: target.position })
      .eq("id", current.id);

    const { error: targetError } = await supabase
      .from("quiz_questions")
      .update({ position: current.position })
      .eq("id", target.id);

    if (currentError || targetError) {
      setError("Could not reorder questions.");
    }

    setIsReordering(false);
    router.refresh();
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] flex justify-end bg-black/25">
        <div className="h-full w-full max-w-[780px] overflow-y-auto border-l border-[#e5e7eb] bg-[#f7f8fa] shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#eaecf0] bg-white/95 px-7 py-5 backdrop-blur">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#f3f0ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6847df]">
                  Quiz
                </span>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    isPublished
                      ? "bg-[#ecfdf3] text-[#067647]"
                      : "bg-[#f2f4f7] text-[#667085]"
                  }`}
                >
                  {isPublished ? "Published" : "Draft"}
                </span>
              </div>

              <h2 className="mt-2 text-xl font-semibold text-[#172033]">
                {quiz.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] bg-white text-lg text-[#667085]"
            >
              ×
            </button>
          </div>

          <div className="space-y-6 p-7">
            <form
              onSubmit={saveQuiz}
              className="space-y-5 rounded-[18px] border border-[#e5e7eb] bg-white p-5"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                  Quiz settings
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-[#344054]">
                  Title
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
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
                  rows={2}
                  className="mt-2 w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
                />
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
                  className="mt-2 w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#344054]">
                    Passing score
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={passingScore}
                    onChange={(event) =>
                      setPassingScore(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
                  />
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
                    className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "Required",
                    isRequired,
                    setIsRequired,
                  ],
                  [
                    "Published",
                    isPublished,
                    setIsPublished,
                  ],
                  [
                    "Shuffle questions",
                    shuffleQuestions,
                    setShuffleQuestions,
                  ],
                  [
                    "Show results",
                    showResults,
                    setShowResults,
                  ],
                ].map(([label, value, setter]) => {
                  const update = setter as (
                    value: boolean
                  ) => void;

                  return (
                    <label
                      key={label as string}
                      className="flex items-center justify-between rounded-xl bg-[#f9fafb] px-3.5 py-3"
                    >
                      <span className="text-sm text-[#475467]">
                        {label as string}
                      </span>

                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(event) =>
                          update(event.target.checked)
                        }
                      />
                    </label>
                  );
                })}
              </div>

              {error && (
                <div className="rounded-xl bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
                  {error}
                </div>
              )}

              <div className="flex justify-between gap-3 border-t border-[#eaecf0] pt-4">
                <button
                  type="button"
                  onClick={deleteQuiz}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-[#b42318] hover:bg-[#fef3f2]"
                >
                  Delete quiz
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save settings"}
                </button>
              </div>
            </form>

            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                    Questions
                  </p>

                  <p className="mt-1 text-sm text-[#667085]">
                    {quiz.quiz_questions.length}{" "}
                    {quiz.quiz_questions.length === 1
                      ? "question"
                      : "questions"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingQuestion(true)
                  }
                  className="rounded-xl bg-[#6847df] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  + Add question
                </button>
              </div>

              {quiz.quiz_questions.length > 0 ? (
                <div className="space-y-3">
                  {quiz.quiz_questions.map(
                    (question, index) => (
                      <div
                        key={question.id}
                        className="rounded-[16px] border border-[#e5e7eb] bg-white p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f0ff] text-xs font-semibold text-[#6847df]">
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#f2f4f7] px-2 py-1 text-[10px] font-semibold text-[#667085]">
                                {typeLabels[
                                  question.question_type
                                ] ??
                                  question.question_type}
                              </span>

                              <span className="text-[11px] text-[#98a2b3]">
                                {question.points}{" "}
                                {Number(question.points) === 1
                                  ? "point"
                                  : "points"}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-medium leading-5 text-[#344054]">
                              {question.question_text}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                moveQuestion(index, "up")
                              }
                              disabled={
                                index === 0 ||
                                isReordering
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] text-xs disabled:opacity-30"
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveQuestion(
                                  index,
                                  "down"
                                )
                              }
                              disabled={
                                index ===
                                  quiz.quiz_questions
                                    .length -
                                    1 ||
                                isReordering
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e4e7ec] text-xs disabled:opacity-30"
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setEditingQuestion(
                                  question
                                )
                              }
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#475467] hover:bg-[#f2f4f7]"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#d0d5dd] bg-white px-5 py-8 text-center">
                  <p className="text-sm text-[#98a2b3]">
                    No questions have been added yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAddingQuestion && (
        <QuestionEditor
          quizId={quiz.id}
          nextPosition={
            quiz.quiz_questions.length + 1
          }
          onClose={() =>
            setIsAddingQuestion(false)
          }
        />
      )}

      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          quizId={quiz.id}
          onClose={() =>
            setEditingQuestion(null)
          }
        />
      )}
    </>
  );
}