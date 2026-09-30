"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import QuestionEditor, {
  QuizQuestion,
} from "@/components/trainer/QuestionEditor";
import type { Quiz } from "@/components/trainer/QuizEditor";

type Checkpoint = {
  id: string;
  quiz_id: string | null;
  title: string;
  description: string | null;
  checkpoint_type: string;
  passing_score: number | null;
  position: number;
  quizzes: Quiz[]
};

type CheckpointEditorProps = {
  checkpoint: Checkpoint;
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

export default function CheckpointEditor({
  checkpoint,
  onClose,
}: CheckpointEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(checkpoint.title);
  const [description, setDescription] = useState(
    checkpoint.description ?? ""
  );
  const [checkpointType, setCheckpointType] = useState(
    checkpoint.checkpoint_type
  );
  const [passingScore, setPassingScore] = useState(
    checkpoint.passing_score?.toString() ?? ""
  );

  const [editingQuestion, setEditingQuestion] =
    useState<QuizQuestion | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] =
    useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  const quiz = checkpoint.quizzes?.[0] ?? null;
const questions = quiz?.quiz_questions ?? [];

  useEffect(() => {
    setTitle(checkpoint.title);
    setDescription(checkpoint.description ?? "");
    setCheckpointType(checkpoint.checkpoint_type);
    setPassingScore(
      checkpoint.passing_score?.toString() ?? ""
    );
    setErrorMessage(null);
    setShowDeleteConfirmation(false);
  }, [checkpoint]);

  const isBusy =
    isSaving || isDeleting || isReordering;

  async function handleSave() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage("Checkpoint title is required.");
      return;
    }

    let parsedPassingScore: number | null = null;

    if (passingScore.trim() !== "") {
      parsedPassingScore = Number(passingScore);

      if (
        !Number.isFinite(parsedPassingScore) ||
        parsedPassingScore < 0 ||
        parsedPassingScore > 100
      ) {
        setErrorMessage(
          "Passing score must be a number between 0 and 100."
        );
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { error: checkpointError } = await supabase
      .from("checkpoints")
      .update({
        title: cleanTitle,
        description: description.trim() || null,
        checkpoint_type: checkpointType,
        passing_score: parsedPassingScore,
      })
      .eq("id", checkpoint.id);

    if (checkpointError) {
      console.error(
        "Error updating checkpoint:",
        checkpointError
      );

      setErrorMessage(
        "We couldn't save this checkpoint. Please try again."
      );

      setIsSaving(false);
      return;
    }

    if (checkpoint.quiz_id) {
      const { error: quizError } = await supabase
        .from("quizzes")
        .update({
          title: cleanTitle,
          description: description.trim() || null,
          passing_score: parsedPassingScore ?? 0,
        })
        .eq("id", checkpoint.quiz_id);

      if (quizError) {
        console.error(
          "Error updating checkpoint assessment:",
          quizError
        );

        setErrorMessage(
          "The checkpoint was saved, but its assessment settings could not be updated."
        );

        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    const quizId = checkpoint.quiz_id;

    const { error } = await supabase
      .from("checkpoints")
      .delete()
      .eq("id", checkpoint.id);

    if (error) {
      console.error("Error deleting checkpoint:", error);

      setErrorMessage(
        "We couldn't delete this checkpoint. Please try again."
      );

      setIsDeleting(false);
      return;
    }

    if (quizId) {
      const { error: quizDeleteError } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (quizDeleteError) {
        console.error(
          "Error deleting checkpoint assessment:",
          quizDeleteError
        );
      }
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
      targetIndex >= questions.length
    ) {
      return;
    }

    const current = questions[index];
    const target = questions[targetIndex];

    setIsReordering(true);
    setErrorMessage(null);

    const { error: firstTempError } = await supabase
      .from("quiz_questions")
      .update({
        position: -700001,
      })
      .eq("id", current.id);

    if (firstTempError) {
      console.error(firstTempError);
      setErrorMessage(
        "We couldn't reorder the questions."
      );
      setIsReordering(false);
      return;
    }

    const { error: secondTempError } = await supabase
      .from("quiz_questions")
      .update({
        position: -700002,
      })
      .eq("id", target.id);

    if (secondTempError) {
      await supabase
        .from("quiz_questions")
        .update({
          position: current.position,
        })
        .eq("id", current.id);

      setErrorMessage(
        "We couldn't reorder the questions."
      );
      setIsReordering(false);
      return;
    }

    const { error: currentError } = await supabase
      .from("quiz_questions")
      .update({
        position: target.position,
      })
      .eq("id", current.id);

    const { error: targetError } = await supabase
      .from("quiz_questions")
      .update({
        position: current.position,
      })
      .eq("id", target.id);

    if (currentError || targetError) {
      console.error(currentError || targetError);
      setErrorMessage(
        "We couldn't reorder the questions."
      );
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
                  Checkpoint
                </span>

                <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[10px] font-semibold text-[#067647]">
                  Assessment
                </span>
              </div>

              <h2 className="mt-2 text-xl font-semibold text-[#172033]">
                {checkpoint.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e7ec] bg-white text-lg text-[#667085] disabled:opacity-50"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="space-y-6 p-7">
            <div className="space-y-5 rounded-[18px] border border-[#e5e7eb] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                Checkpoint settings
              </p>

              <div>
                <label className="text-sm font-medium text-[#344054]">
                  Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  disabled={isBusy}
                  className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm text-[#172033] outline-none"
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
                  disabled={isBusy}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 text-sm leading-6 text-[#172033] outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#344054]">
                    Checkpoint type
                  </label>

                  <select
                    value={checkpointType}
                    onChange={(event) =>
                      setCheckpointType(
                        event.target.value
                      )
                    }
                    disabled={isBusy}
                    className="mt-2 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none"
                  >
                    <option value="knowledge">
                      Knowledge
                    </option>
                    <option value="practical">
                      Practical
                    </option>
                    <option value="mock_call">
                      Mock Call
                    </option>
                    <option value="trainer_review">
                      Trainer Review
                    </option>
                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#344054]">
                    Passing score
                  </label>

                  <div className="relative mt-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={passingScore}
                      onChange={(event) =>
                        setPassingScore(
                          event.target.value
                        )
                      }
                      disabled={isBusy}
                      placeholder="80"
                      className="w-full rounded-xl border border-[#d0d5dd] px-3.5 py-2.5 pr-10 text-sm text-[#172033] outline-none"
                    />

                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#98a2b3]">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3">
                  <p className="text-sm text-[#b42318]">
                    {errorMessage}
                  </p>
                </div>
              )}

              <div className="flex justify-end border-t border-[#eef0f3] pt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isBusy}
                  className="rounded-xl bg-[#172033] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving..."
                    : "Save settings"}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
                    Questions
                  </p>

                  <p className="mt-1 text-sm text-[#667085]">
                    {questions.length}{" "}
                    {questions.length === 1
                      ? "question"
                      : "questions"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsAddingQuestion(true)
                  }
                  disabled={
                    !checkpoint.quiz_id || isBusy
                  }
                  className="rounded-xl bg-[#6847df] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Add question
                </button>
              </div>

              {!checkpoint.quiz_id && (
                <div className="mb-3 rounded-xl border border-[#fedf89] bg-[#fffaeb] px-4 py-3">
                  <p className="text-xs leading-5 text-[#b54708]">
                    This checkpoint was created before assessment
                    questions were enabled. Create a new checkpoint
                    to use the question builder.
                  </p>
                </div>
              )}

              {questions.length > 0 ? (
                <div className="space-y-3">
                  {questions.map(
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
                                {Number(
                                  question.points
                                ) === 1
                                  ? "point"
                                  : "points"}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-medium leading-5 text-[#344054]">
                              {
                                question.question_text
                              }
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                moveQuestion(
                                  index,
                                  "up"
                                )
                              }
                              disabled={
                                index === 0 ||
                                isBusy
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
                                  questions.length -
                                    1 ||
                                isBusy
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
                              disabled={isBusy}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#475467] hover:bg-[#f2f4f7] disabled:opacity-50"
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

            <div className="rounded-[18px] border border-[#fecdca] bg-white p-5">
              <p className="text-sm font-semibold text-[#b42318]">
                Delete checkpoint
              </p>

              <p className="mt-1 text-xs leading-5 text-[#98a2b3]">
                Permanently remove this checkpoint and its
                assessment questions.
              </p>

              {!showDeleteConfirmation ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirmation(true)
                  }
                  disabled={isBusy}
                  className="mt-3 rounded-xl border border-[#fecdca] bg-white px-3.5 py-2 text-xs font-semibold text-[#b42318] hover:bg-[#fef3f2] disabled:opacity-50"
                >
                  Delete
                </button>
              ) : (
                <div className="mt-3 rounded-xl bg-[#fef3f2] p-4">
                  <p className="text-sm font-semibold text-[#912018]">
                    Delete “{checkpoint.title}”?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#b42318]">
                    This action cannot be undone.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDeleteConfirmation(
                          false
                        )
                      }
                      disabled={isBusy}
                      className="rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-xs font-semibold text-[#344054]"
                    >
                      Keep checkpoint
                    </button>

                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isBusy}
                      className="rounded-lg bg-[#b42318] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {isDeleting
                        ? "Deleting..."
                        : "Yes, delete checkpoint"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAddingQuestion && checkpoint.quiz_id && (
        <QuestionEditor
          quizId={checkpoint.quiz_id}
          nextPosition={questions.length + 1}
          onClose={() =>
            setIsAddingQuestion(false)
          }
        />
      )}

      {editingQuestion &&
        checkpoint.quiz_id && (
          <QuestionEditor
            question={editingQuestion}
            quizId={checkpoint.quiz_id}
            onClose={() =>
              setEditingQuestion(null)
            }
          />
        )}
    </>
  );
}