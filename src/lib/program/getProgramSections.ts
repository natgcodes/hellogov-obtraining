import { createClient } from "@/lib/supabase/server";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";

export async function getProgramSections(
  programId: string = HELLOGOV_PROGRAM_ID
) {
  const supabase = await createClient();

  const [
    setupResult,
    certificationResult,
    postTrainingResult,
  ] = await Promise.all([
    supabase
      .from("setup_items")
      .select(`
        id,
        program_id,
        title,
        description,
        position,
        is_required
      `)
      .eq("program_id", programId)
      .order("position", { ascending: true }),

    supabase
      .from("certifications")
      .select(`
        id,
        program_id,
        title,
        description,
        passing_score,

        certification_components (
          id,
          title,
          description,
          component_type,
          passing_score,
          position
        )
      `)
      .eq("program_id", programId)
      .order("position", {
        referencedTable: "certification_components",
        ascending: true,
      })
      .maybeSingle(),

    supabase
      .from("post_training")
      .select(`
        id,
        program_id,
        title,
        description,
        disclaimer,

        post_training_stages (
          id,
          title,
          description,
          position
        )
      `)
      .eq("program_id", programId)
      .order("position", {
        referencedTable: "post_training_stages",
        ascending: true,
      })
      .maybeSingle(),
  ]);

  if (setupResult.error) {
    console.error(
      "Error loading setup items:",
      setupResult.error
    );
  }

  if (certificationResult.error) {
    console.error(
      "Error loading certification:",
      certificationResult.error
    );
  }

  if (postTrainingResult.error) {
    console.error(
      "Error loading post-training:",
      postTrainingResult.error
    );
  }

  return {
    setupItems: setupResult.data ?? [],
    certification: certificationResult.data ?? null,
    postTraining: postTrainingResult.data ?? null,
  };
}