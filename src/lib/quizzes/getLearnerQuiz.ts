import { createClient } from "@/lib/supabase/server";
import type {
  LearnerQuizDetail,
  LearnerQuizQuestion,
  SafeMatchingItem,
  SafeQuizOption,
} from "./types";

export async function getLearnerQuiz(
  quizId: string
): Promise<LearnerQuizDetail | null> {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // LOAD PUBLISHED QUIZ
  // ---------------------------------------------------------

  const {
    data: quiz,
    error: quizError,
  } = await supabase
    .from("quizzes")
    .select(`
      id,
      module_id,
      title,
      description,
      instructions,
      passing_score,
      max_attempts,
      show_results,
      shuffle_questions,

      quiz_questions (
        id,
        question_text,
        question_type,
        instructions,
        points,
        position,
        is_required,
        allow_partial_credit
      )
    `)
    .eq("id", quizId)
    .eq("is_published", true)
    .single();

  if (quizError || !quiz) {
    console.error(
      "Error loading learner quiz:",
      quizError
    );

    return null;
  }

  // ---------------------------------------------------------
  // ORDER QUESTIONS
  // ---------------------------------------------------------

  const orderedQuestions = [
    ...(quiz.quiz_questions ?? []),
  ].sort(
    (a, b) =>
      Number(a.position ?? 0) -
      Number(b.position ?? 0)
  );

  // ---------------------------------------------------------
  // LOAD LEARNER-SAFE QUESTION DATA
  //
  // Correct answers must never be loaded directly into the
  // learner client. Options and matching data are retrieved
  // through learner-safe RPCs.
  // ---------------------------------------------------------

  try {
    const questions: LearnerQuizQuestion[] =
      await Promise.all(
        orderedQuestions.map(
          async (question) => {
            let options: SafeQuizOption[] = [];
            let matchingItems: SafeMatchingItem[] =
              [];

            // -------------------------------------------------
            // CHOICE QUESTIONS
            // -------------------------------------------------

            if (
              question.question_type ===
                "single_choice" ||
              question.question_type ===
                "multiple_choice" ||
              question.question_type ===
                "true_false"
            ) {
              const {
                data,
                error: optionsError,
              } = await supabase.rpc(
                "get_quiz_options_for_learner",
                {
                  target_question_id:
                    question.id,
                }
              );

              if (optionsError) {
                console.error(
                  `Error loading options for question ${question.id}:`,
                  optionsError
                );

                throw new Error(
                  "Unable to load quiz options."
                );
              }

              options =
                (data ??
                  []) as SafeQuizOption[];
            }

            // -------------------------------------------------
            // MATCHING QUESTIONS
            // -------------------------------------------------

            if (
              question.question_type ===
                "matching" ||
              question.question_type ===
                "match_cards"
            ) {
              const {
                data,
                error: matchingError,
              } = await supabase.rpc(
                "get_matching_items_for_learner",
                {
                  target_question_id:
                    question.id,
                }
              );

              if (matchingError) {
                console.error(
                  `Error loading matching items for question ${question.id}:`,
                  matchingError
                );

                throw new Error(
                  "Unable to load matching question."
                );
              }

              matchingItems =
                (data ??
                  []) as SafeMatchingItem[];
            }

            // -------------------------------------------------
            // NORMALIZED QUESTION
            // -------------------------------------------------

            return {
              id: question.id,
              question_text:
                question.question_text,
              question_type:
                question.question_type as LearnerQuizQuestion["question_type"],
              instructions:
                question.instructions,
              points: Number(
                question.points ?? 0
              ),
              position: Number(
                question.position ?? 0
              ),
              is_required:
                question.is_required ?? false,
              allow_partial_credit:
                question.allow_partial_credit ??
                false,
              options,
              matchingItems,
            };
          }
        )
      );

    // -------------------------------------------------------
    // NORMALIZED LEARNER QUIZ
    // -------------------------------------------------------

    return {
      id: quiz.id,
      module_id: quiz.module_id,
      title: quiz.title,
      description: quiz.description,
      instructions: quiz.instructions,
      passing_score: Number(
        quiz.passing_score ?? 0
      ),
      max_attempts: Number(
        quiz.max_attempts ?? 1
      ),
      show_results:
        quiz.show_results ?? false,
      shuffle_questions:
        quiz.shuffle_questions ?? false,
      questions,
    };
  } catch (questionLoadError) {
    console.error(
      "Unable to build learner quiz:",
      questionLoadError
    );

    return null;
  }
}