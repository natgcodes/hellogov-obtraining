import { createClient } from "@/lib/supabase/server";

const PROGRAM_ID =
  "5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0";

export async function getProgramSections() {
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
      .eq("program_id", PROGRAM_ID)
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
      .eq("program_id", PROGRAM_ID)
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
      .eq("program_id", PROGRAM_ID)
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