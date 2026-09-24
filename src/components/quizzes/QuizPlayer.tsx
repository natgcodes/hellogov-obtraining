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

  const questions = useMemo(() => {
    if (!quiz.shuffle_questions) {
      return quiz.questions;
    }

    // Stable enough for this mounted attempt:
    // shuffle once during memo creation.
    return [...quiz.questions].sort(
      () => Math.random() - 0.5
    );
  }, [quiz.questions, quiz.shuffle_questions]);

  function updateAnswer(
    questionId: string,
    value: AnswerState
  ) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  async function saveQuestion(
    question: LearnerQuizQuestion
  ) {
    const answer = answers[question.id];

    if (!answer) return true;

    setSavingQuestion(question.id);
    setError(null);

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

    // File upload is saved immediately
    // by FileUploadQuestion.

    setSavingQuestion(null);

    if (rpcError) {
      setError(rpcError.message);
      return false;
    }

    return true;
  }

  async function saveAllAnswers() {
    for (const question of questions) {
      const success =
        await saveQuestion(question);

      if (!success) return false;
    }

    return true;
  }

  function hasRequiredAnswer(
    question: LearnerQuizQuestion
  ) {
    if (!question.is_required) return true;

    const answer = answers[question.id];

    if (!answer) return false;

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

    const saved = await saveAllAnswers();

    if (!saved) {
      setSubmitting(false);
      return;
    }

    const { data, error: submitError } =
      await supabase.rpc(
        "submit_quiz_attempt",
        {
          target_attempt_id: attemptId,
        }
      );

    if (submitError) {
      setError(submitError.message);
      setSubmitting(false);
      return;
    }

    const submission =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!submission) {
      setError(
        "The quiz was submitted but no result was returned."
      );
      setSubmitting(false);
      return;
    }

    const finalResult: QuizSubmissionResult = {
      attempt_id: submission.attempt_id,
      score: Number(submission.score ?? 0),
      passed: submission.passed,
      status: submission.status,
    };

    setResult(finalResult);

// Recalculate the module after grading.
// Do NOT refresh this page after submission.
// The learner must remain on the submitted result screen.
await supabase.rpc(
  "recalculate_module_progress",
  {
    target_module_id: quiz.module_id,
  }
);

setSubmitting(false);
  }

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

  return (
    <div>
      <div className="space-y-5">
        {questions.map(
          (question, index) => {
            const answer =
              answers[question.id] ?? {};

            return (
              <section
                id={`question-${question.id}`}
                key={question.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Question {index + 1}
                    </p>

                    <h2 className="mt-2 text-lg font-semibold leading-7 text-slate-950">
                      {question.question_text}
                    </h2>

                    {question.instructions && (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {question.instructions}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {question.points}{" "}
                    {Number(question.points) === 1
                      ? "pt"
                      : "pts"}
                  </span>
                </div>

                <div className="mt-5">
                  {(question.question_type ===
                    "single_choice" ||
                    question.question_type ===
                      "true_false") && (
                    <div className="space-y-2">
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
                              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                                selected
                                  ? "border-purple-500 bg-purple-50"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  selected
                                    ? "border-purple-600"
                                    : "border-slate-300"
                                }`}
                              >
                                {selected && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
                                )}
                              </span>

                              <span className="text-sm font-medium text-slate-800">
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
                    <div className="space-y-2">
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
                              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                                selected
                                  ? "border-purple-500 bg-purple-50"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                                  selected
                                    ? "border-purple-600 bg-purple-600 text-white"
                                    : "border-slate-300 text-transparent"
                                }`}
                              >
                                ✓
                              </span>

                              <span className="text-sm font-medium text-slate-800">
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
                    <textarea
                      rows={5}
                      value={answer.text ?? ""}
                      onChange={(event) =>
                        updateAnswer(
                          question.id,
                          {
                            text:
                              event.target.value,
                          }
                        )
                      }
                      placeholder="Write your answer..."
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-purple-400"
                    />
                  )}

                  {question.question_type ===
                    "file_upload" && (
                    <FileUploadQuestion
                      attemptId={attemptId}
                      questionId={question.id}
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
                </div>

                {savingQuestion ===
                  question.id && (
                  <p className="mt-3 text-xs text-slate-400">
                    Saving...
                  </p>
                )}
              </section>
            );
          }
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 mt-8 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {questions.length}{" "}
            {questions.length === 1
              ? "question"
              : "questions"}{" "}
            · Passing score{" "}
            {quiz.passing_score}%
          </p>

          <button
            type="button"
            disabled={submitting}
            onClick={submitQuiz}
            className="rounded-xl bg-[#e84545] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : "Submit quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}