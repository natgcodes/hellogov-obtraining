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

  const { data: quiz, error } = await supabase
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

  if (error || !quiz) {
    console.error("Error loading learner quiz:", error);
    return null;
  }

  const orderedQuestions = [...(quiz.quiz_questions ?? [])].sort(
    (a, b) => a.position - b.position
  );

  const questions: LearnerQuizQuestion[] =
    await Promise.all(
      orderedQuestions.map(async (question) => {
        let options: SafeQuizOption[] = [];
        let matchingItems: SafeMatchingItem[] = [];

        if (
          question.question_type === "single_choice" ||
          question.question_type === "multiple_choice" ||
          question.question_type === "true_false"
        ) {
          const { data, error: optionsError } =
            await supabase.rpc(
              "get_quiz_options_for_learner",
              {
                target_question_id: question.id,
              }
            );

          if (optionsError) {
            console.error(
              "Error loading quiz options:",
              optionsError
            );
          }

          options = (data ?? []) as SafeQuizOption[];
        }

        if (
          question.question_type === "matching" ||
          question.question_type === "match_cards"
        ) {
          const { data, error: matchingError } =
            await supabase.rpc(
              "get_matching_items_for_learner",
              {
                target_question_id: question.id,
              }
            );

          if (matchingError) {
            console.error(
              "Error loading matching items:",
              matchingError
            );
          }

          matchingItems = (data ?? []) as SafeMatchingItem[];
        }

        return {
          ...question,
          question_type:
            question.question_type as LearnerQuizQuestion["question_type"],
          options,
          matchingItems,
        };
      })
    );

  return {
    id: quiz.id,
    module_id: quiz.module_id,
    title: quiz.title,
    description: quiz.description,
    instructions: quiz.instructions,
    passing_score: Number(quiz.passing_score),
    max_attempts: quiz.max_attempts,
    show_results: quiz.show_results,
    shuffle_questions: quiz.shuffle_questions,
    questions,
  };
}