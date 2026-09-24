import { createClient } from "@/lib/supabase/server";

export async function getDays() {
  const supabase = await createClient();

  const { data: days, error } = await supabase
    .from("days")
    .select(`
      id,
      day_number,
      title,
      description,
      position,
      is_published,

      modules (
        id,
        title,
        description,
        objective,
        duration_minutes,
        position,
        is_required,

        materials (
          id,
          title,
          description,
          material_type,
          url,
          is_required,
          position
        ),

        activities (
          id,
          title,
          description,
          instructions,
          activity_type,
          duration_minutes,
          is_required,
          position
        ),

        quizzes (
          id,
          module_id,
          title,
          description,
          instructions,
          passing_score,
          max_attempts,
          position,
          is_required,
          is_published,
          shuffle_questions,
          show_results,

          quiz_questions (
            id,
            quiz_id,
            question_text,
            question_type,
            instructions,
            points,
            position,
            is_required,
            allow_partial_credit,

            quiz_options (
              id,
              option_text,
              is_correct,
              position
            ),

            quiz_matching_pairs (
              id,
              left_text,
              right_text,
              position
            )
          )
        )
      ),

      checkpoints (
        id,
        quiz_id,
        title,
        description,
        checkpoint_type,
        passing_score,
        position,

        quizzes (
          id,
          module_id,
          title,
          description,
          instructions,
          passing_score,
          max_attempts,
          position,
          is_required,
          is_published,
          shuffle_questions,
          show_results,

          quiz_questions (
            id,
            quiz_id,
            question_text,
            question_type,
            instructions,
            points,
            position,
            is_required,
            allow_partial_credit,

            quiz_options (
              id,
              option_text,
              is_correct,
              position
            ),

            quiz_matching_pairs (
              id,
              left_text,
              right_text,
              position
            )
          )
        )
      )
    `)
    .order("position", {
      ascending: true,
    })
    .order("position", {
      referencedTable: "modules",
      ascending: true,
    })
    .order("position", {
      referencedTable: "modules.materials",
      ascending: true,
    })
    .order("position", {
      referencedTable: "modules.activities",
      ascending: true,
    })
    .order("position", {
      referencedTable: "modules.quizzes",
      ascending: true,
    })
    .order("position", {
      referencedTable: "modules.quizzes.quiz_questions",
      ascending: true,
    })
    .order("position", {
      referencedTable:
        "modules.quizzes.quiz_questions.quiz_options",
      ascending: true,
    })
    .order("position", {
      referencedTable:
        "modules.quizzes.quiz_questions.quiz_matching_pairs",
      ascending: true,
    })
    .order("position", {
      referencedTable: "checkpoints",
      ascending: true,
    })
    .order("position", {
      referencedTable: "checkpoints.quizzes.quiz_questions",
      ascending: true,
    })
    .order("position", {
      referencedTable:
        "checkpoints.quizzes.quiz_questions.quiz_options",
      ascending: true,
    })
    .order("position", {
      referencedTable:
        "checkpoints.quizzes.quiz_questions.quiz_matching_pairs",
      ascending: true,
    });

  if (error) {
    console.error(
      "Error loading training days:",
      error
    );
    return [];
  }

  return days ?? [];
}