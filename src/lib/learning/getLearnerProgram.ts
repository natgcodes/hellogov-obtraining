import { createClient } from "@/lib/supabase/server";
import type { LearnerProgram } from "./types";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";

export async function getLearnerProgram(): Promise<LearnerProgram | null> {
  const supabase = await createClient();

  const { data: programs, error } = await supabase
    .from("programs")
    .select(`
      id,
      title,
      description,
      status,

      setup_items (
        id,
        title,
        description,
        position,
        is_required
      ),

      days (
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
            title,
            description,
            instructions,
            passing_score,
            max_attempts,
            position,
            is_required,
            is_published,
            show_results
          )
        )
      )
    `)
    .eq("id", HELLOGOV_PROGRAM_ID)
    .eq("status", "published")
    .limit(1);

  if (error) {
    console.error("Error loading learner program:", error);
    return null;
  }

  const program = programs?.[0];

  if (!program) return null;

  const normalized = {
    ...program,

    setup_items: [...(program.setup_items ?? [])].sort(
      (a, b) => a.position - b.position
    ),

    days: [...(program.days ?? [])]
      .filter((day) => day.is_published)
      .sort((a, b) => a.position - b.position)
      .map((day) => ({
        ...day,

        modules: [...(day.modules ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((module) => ({
            ...module,

            materials: [...(module.materials ?? [])].sort(
              (a, b) => a.position - b.position
            ),

            activities: [...(module.activities ?? [])].sort(
              (a, b) => a.position - b.position
            ),

            quizzes: [...(module.quizzes ?? [])]
              .filter((quiz) => quiz.is_published)
              .sort((a, b) => a.position - b.position),
          })),
      })),
  };

  return normalized as LearnerProgram;
}