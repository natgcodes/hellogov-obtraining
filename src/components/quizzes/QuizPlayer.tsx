"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MatchingQuestion from "./MatchingQuestion";
import MatchCardsQuestion from "./MatchCardsQuestion";
import FileUploadQuestion from "./FileUploadQuestion";
import QuizResults from "./QuizResults";
import type {
  AnswerState,
  LearnerQuizDetail,
  LearnerQuizQuestion,
  QuizSubmissionResult,
} from "@/lib/quizzes/types";

type Props = {
  quiz: LearnerQuizDetail;
  attemptId: string;
  dayId?: string;
};

export default function QuizPlayer({
  quiz,
  attemptId,
  dayId,
}: Props) {
  const supabase = createClient();

  const [answers, setAnswers] = useState<
    Record<string, AnswerState>
  >({});

  const [savingQuestion, setSavingQuestion] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<QuizSubmissionResult | null>(null);

  // ---------------------------------------------------------
  // QUESTIONS
  // ---------------------------------------------------------

  const questions = useMemo(() => {
    if (!quiz.shuffle_questions) {
      return quiz.questions;
    }

    return [...quiz.questions].sort(
      () => Math.random() - 0.5
    );
  }, [quiz.questions, quiz.shuffle_questions]);

  // ---------------------------------------------------------
  // ANSWER STATE
  // ---------------------------------------------------------

  function updateAnswer(
    questionId: string,
    value: AnswerState
  ) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  // ---------------------------------------------------------
  // SAVE INDIVIDUAL QUESTION
  // ---------------------------------------------------------

  async function saveQuestion(
    question: LearnerQuizQuestion
  ) {
    const answer = answers[question.id];

    if (!answer) {
      return true;
    }

    setSavingQuestion(question.id);
    setError(null);

    try {
      let rpcError: { message: string } | null =
        null;

      if (
        question.question_type ===
          "single_choice" ||
        question.question_type === "true_false"
      ) {
        const { error } = await supabase.rpc(
          "save_quiz_answer",
          {
            target_attempt_id: attemptId,
            target_question_id: question.id,
            target_option_id:
              answer.optionId ?? null,
            target_answer_text: null,
          }
        );

        rpcError = error;
      }

      if (
        question.question_type ===
        "multiple_choice"
      ) {
        const { error } = await supabase.rpc(
          "save_multiple_choice_answer",
          {
            target_attempt_id: attemptId,
            target_question_id: question.id,
            target_option_ids:
              answer.optionIds ?? [],
          }
        );

        rpcError = error;
      }

      if (
        question.question_type === "matching" ||
        question.question_type === "match_cards"
      ) {
        const matches = answer.matches ?? {};

        const leftIds = Object.keys(matches);
        const rightIds = Object.values(matches);

        const { error } = await supabase.rpc(
          "save_matching_answer",
          {
            target_attempt_id: attemptId,
            target_question_id: question.id,
            left_pair_ids: leftIds,
            selected_right_public_ids:
              rightIds,
          }
        );

        rpcError = error;
      }

      if (
        question.question_type === "open_text"
      ) {
        const { error } = await supabase.rpc(
          "save_quiz_answer",
          {
            target_attempt_id: attemptId,
            target_question_id: question.id,
            target_option_id: null,
            target_answer_text:
              answer.text ?? "",
          }
        );

        rpcError = error;
      }

      // File uploads are saved immediately by
      // FileUploadQuestion.

      if (rpcError) {
        setError(rpcError.message);
        return false;
      }

      return true;
    } catch (saveError) {
      console.error(
        "Unable to save quiz answer:",
        saveError
      );

      setError(
        "Unable to save your answer. Please try again."
      );

      return false;
    } finally {
      setSavingQuestion(null);
    }
  }

  // ---------------------------------------------------------
  // SAVE ALL ANSWERS
  // ---------------------------------------------------------

  async function saveAllAnswers() {
    for (const question of questions) {
      const success =
        await saveQuestion(question);

      if (!success) {
        return false;
      }
    }

    return true;
  }

  // ---------------------------------------------------------
  // REQUIRED ANSWER VALIDATION
  // ---------------------------------------------------------

  function hasRequiredAnswer(
    question: LearnerQuizQuestion
  ) {
    if (!question.is_required) {
      return true;
    }

    const answer = answers[question.id];

    if (!answer) {
      return false;
    }

    switch (question.question_type) {
      case "single_choice":
      case "true_false":
        return Boolean(answer.optionId);

      case "multiple_choice":
        return Boolean(
          answer.optionIds &&
            answer.optionIds.length > 0
        );

      case "matching":
      case "match_cards": {
        const leftCount =
          question.matchingItems.filter(
            (item) =>
              item.item_side === "left"
          ).length;

        return (
          Object.keys(
            answer.matches ?? {}
          ).length === leftCount
        );
      }

      case "open_text":
        return Boolean(answer.text?.trim());

      case "file_upload":
        return Boolean(answer.filePath);

      default:
        return false;
    }
  }

  // ---------------------------------------------------------
  // SUBMIT QUIZ / CHECKPOINT
  // ---------------------------------------------------------

  async function submitQuiz() {
    setError(null);

    const missing = questions.find(
      (question) =>
        !hasRequiredAnswer(question)
    );

    if (missing) {
      setError(
        `Please answer the required question: "${missing.question_text}"`
      );

      document
        .getElementById(
          `question-${missing.id}`
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

      return;
    }

    setSubmitting(true);

    try {
      // Save all locally-entered answers before
      // finalizing the attempt.
      const saved = await saveAllAnswers();

      if (!saved) {
        return;
      }

      const {
        data,
        error: submitError,
      } = await supabase.rpc(
        "submit_quiz_attempt",
        {
          target_attempt_id: attemptId,
        }
      );

      if (submitError) {
        setError(submitError.message);
        return;
      }

      const submission =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!submission) {
        setError(
          "The assessment was submitted but no result was returned."
        );
        return;
      }

      const finalResult: QuizSubmissionResult = {
        attempt_id: submission.attempt_id,
        score: Number(
          submission.score ?? 0
        ),
        passed: submission.passed,
        status: submission.status,
      };

      // -----------------------------------------------------
      // NORMAL MODULE QUIZ
      //
      // Only module quizzes should recalculate module
      // progress here.
      //
      // Checkpoint quizzes have module_id = null and are
      // synchronized through the checkpoint result flow.
      // -----------------------------------------------------

      if (quiz.module_id) {
        const {
          error: moduleProgressError,
        } = await supabase.rpc(
          "recalculate_module_progress",
          {
            target_module_id:
              quiz.module_id,
          }
        );

        if (moduleProgressError) {
          console.error(
            "Unable to recalculate module progress:",
            moduleProgressError
          );
        }
      }

      // The submission itself succeeded, so always show the
      // learner the result even if a secondary progress
      // recalculation failed.
      setResult(finalResult);
    } catch (submitException) {
      console.error(
        "Unable to submit assessment:",
        submitException
      );

      setError(
        "Unable to submit this assessment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------
  // RESULTS
  // ---------------------------------------------------------

  if (result) {
    return (
      <QuizResults
        result={result}
        passingScore={quiz.passing_score}
        showResults={quiz.show_results}
        dayId={dayId}
      />
    );
  }

  // ---------------------------------------------------------
  // QUIZ PLAYER
  // ---------------------------------------------------------

  return (
    <div>
      <div className="space-y-4">
        {questions.map(
          (question, index) => {
            const answer =
              answers[question.id] ?? {};

            return (
              <section
                id={`question-${question.id}`}
                key={question.id}
                className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]"
              >
                {/* QUESTION HEADER */}

                <div className="border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#07879B]">
                          Question {index + 1}
                        </p>

                        {question.is_required && (
                          <span className="rounded-full bg-[#EAF8FA] px-2 py-0.5 text-[10px] font-semibold text-[#07879B]">
                            Required
                          </span>
                        )}
                      </div>

                      <h2 className="mt-2 whitespace-pre-wrap text-[16px] font-semibold leading-7 tracking-[-0.01em] text-[var(--text-primary)]">
                        {question.question_text}
                      </h2>

                      {question.instructions && (
                        <div className="mt-3 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                          <p className="whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)]">
                            {question.instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                      {question.points}{" "}
                      {Number(
                        question.points
                      ) === 1
                        ? "pt"
                        : "pts"}
                    </span>
                  </div>
                </div>

                {/* ANSWER AREA */}

                <div className="px-5 py-5 sm:px-6">
                  {(question.question_type ===
                    "single_choice" ||
                    question.question_type ===
                      "true_false") && (
                    <div className="space-y-2.5">
                      {question.options.map(
                        (option) => {
                          const selected =
                            answer.optionId ===
                            option.option_id;

                          return (
                            <button
                              key={
                                option.option_id
                              }
                              type="button"
                              onClick={() =>
                                updateAnswer(
                                  question.id,
                                  {
                                    optionId:
                                      option.option_id,
                                  }
                                )
                              }
                              className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left transition ${
                                selected
                                  ? "border-[#08A9C1] bg-[#EAF8FA]"
                                  : "border-[var(--border)] bg-white hover:border-[#08A9C1]/50 hover:bg-[#F8FCFD]"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                                  selected
                                    ? "border-[#08A9C1]"
                                    : "border-[var(--border)]"
                                }`}
                              >
                                {selected && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-[#08A9C1]" />
                                )}
                              </span>

                              <span
                                className={`whitespace-pre-wrap text-[13px] leading-5 ${
                                  selected
                                    ? "font-semibold text-[var(--text-primary)]"
                                    : "font-medium text-[var(--text-secondary)]"
                                }`}
                              >
                                {
                                  option.option_text
                                }
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}

                  {question.question_type ===
                    "multiple_choice" && (
                    <div>
                      <p className="mb-3 text-[11px] text-[var(--text-muted)]">
                        Select all that apply.
                      </p>

                      <div className="space-y-2.5">
                        {question.options.map(
                          (option) => {
                            const selected =
                              (
                                answer.optionIds ??
                                []
                              ).includes(
                                option.option_id
                              );

                            return (
                              <button
                                key={
                                  option.option_id
                                }
                                type="button"
                                onClick={() => {
                                  const current =
                                    answer.optionIds ??
                                    [];

                                  updateAnswer(
                                    question.id,
                                    {
                                      optionIds:
                                        selected
                                          ? current.filter(
                                              (id) =>
                                                id !==
                                                option.option_id
                                            )
                                          : [
                                              ...current,
                                              option.option_id,
                                            ],
                                    }
                                  );
                                }}
                                className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left transition ${
                                  selected
                                    ? "border-[#08A9C1] bg-[#EAF8FA]"
                                    : "border-[var(--border)] bg-white hover:border-[#08A9C1]/50 hover:bg-[#F8FCFD]"
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border text-[11px] transition ${
                                    selected
                                      ? "border-[#08A9C1] bg-[#08A9C1] text-white"
                                      : "border-[var(--border)] text-transparent"
                                  }`}
                                >
                                  ✓
                                </span>

                                <span
                                  className={`whitespace-pre-wrap text-[13px] leading-5 ${
                                    selected
                                      ? "font-semibold text-[var(--text-primary)]"
                                      : "font-medium text-[var(--text-secondary)]"
                                  }`}
                                >
                                  {
                                    option.option_text
                                  }
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {question.question_type ===
                    "matching" && (
                    <MatchingQuestion
                      items={
                        question.matchingItems
                      }
                      value={
                        answer.matches ?? {}
                      }
                      onChange={(matches) =>
                        updateAnswer(
                          question.id,
                          { matches }
                        )
                      }
                    />
                  )}

                  {question.question_type ===
                    "match_cards" && (
                    <MatchCardsQuestion
                      items={
                        question.matchingItems
                      }
                      value={
                        answer.matches ?? {}
                      }
                      onChange={(matches) =>
                        updateAnswer(
                          question.id,
                          { matches }
                        )
                      }
                    />
                  )}

                  {question.question_type ===
                    "open_text" && (
                    <div>
                      <textarea
                        rows={5}
                        value={answer.text ?? ""}
                        onChange={(event) =>
                          updateAnswer(
                            question.id,
                            {
                              text:
                                event.target
                                  .value,
                            }
                          )
                        }
                        placeholder="Write your answer..."
                        className="w-full resize-y rounded-[12px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] leading-6 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#08A9C1] focus:ring-2 focus:ring-[#08A9C1]/10"
                      />

                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                        Write your response in the
                        field above.
                      </p>
                    </div>
                  )}

                  {question.question_type ===
                    "file_upload" && (
                    <FileUploadQuestion
                      attemptId={attemptId}
                      questionId={
                        question.id
                      }
                      currentFileName={
                        answer.fileName
                      }
                      onUploaded={(
                        filePath,
                        fileName
                      ) =>
                        updateAnswer(
                          question.id,
                          {
                            filePath,
                            fileName,
                          }
                        )
                      }
                    />
                  )}

                  {savingQuestion ===
                    question.id && (
                    <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#08A9C1]" />
                      Saving...
                    </div>
                  )}
                </div>
              </section>
            );
          }
        )}
      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">
          {error}
        </div>
      )}

      {/* SUBMIT BAR */}

      <div className="sticky bottom-4 z-20 mt-6 overflow-hidden rounded-[14px] border border-[var(--border)] bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div>
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">
              Ready to submit?
            </p>

            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {questions.length}{" "}
              {questions.length === 1
                ? "question"
                : "questions"}{" "}
              · Passing score{" "}
              {quiz.passing_score}%
            </p>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={submitQuiz}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] bg-[#08A9C1] px-5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(8,169,193,0.16)] transition hover:bg-[#0795AA] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Submitting...
              </>
            ) : (
              <>
                Submit quiz
                <span aria-hidden="true">
                  →
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}