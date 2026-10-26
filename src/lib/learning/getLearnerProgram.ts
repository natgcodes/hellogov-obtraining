import { createClient } from "@/lib/supabase/server";
import type { LearnerProgram } from "./types";

export async function getLearnerProgram(): Promise<LearnerProgram | null> {
  const totalStart = performance.now();

  const supabase = await createClient();

  // =========================================================
  // AUTHENTICATED USER
  // =========================================================

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error(
      "Unable to identify learner:",
      authError
    );

    return null;
  }

  // =========================================================
  // RESOLVE ASSIGNED WAVE
  //
  // Each learner accesses their own active program.
  //
  // Wave 001 and Wave 002 remain independent.
  // =========================================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("active_program_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error(
      "Unable to load learner wave assignment:",
      profileError
    );

    return null;
  }

  const programId = profile?.active_program_id;

  if (!programId) {
    console.warn(
      "Learner has no assigned training wave:",
      user.id
    );

    return null;
  }

  // =========================================================
  // LOAD ASSIGNED PUBLISHED PROGRAM
  // =========================================================

  const queryStart = performance.now();

  const { data: program, error } = await supabase
    .from("programs")
    .select(`
      id,
      title,
      description,
      status,

      setup_sections (
        id,
        program_id,
        title,
        description,
        instructions
      ),

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
          duration_minutes,
          position,
          is_required
        )
      )
    `)
    .eq("id", programId)
    .eq("status", "published")
    .maybeSingle();

  console.log(
    `[PROGRAM PERF] overview program query: ${Math.round(
      performance.now() - queryStart
    )}ms`
  );

  if (error) {
    console.error(
      "Error loading learner program:",
      error
    );

    return null;
  }

  if (!program) {
    console.warn(
      "Assigned program is unavailable or unpublished:",
      programId
    );

    return null;
  }

  // =========================================================
  // NORMALIZE SETUP SECTION
  // =========================================================

  const rawSetupSection = program.setup_sections;

  const setupSection = Array.isArray(
    rawSetupSection
  )
    ? rawSetupSection[0] ?? null
    : rawSetupSection ?? null;

  // =========================================================
  // NORMALIZE PROGRAM
  // =========================================================

  const normalized = {
    id: program.id,
    title: program.title,
    description: program.description,
    status: program.status,

    setup_section: setupSection
      ? {
          id: setupSection.id,
          program_id: setupSection.program_id,
          title: setupSection.title,
          description: setupSection.description,
          instructions: setupSection.instructions,
        }
      : null,

    setup_items: [
      ...(program.setup_items ?? []),
    ].sort(
      (a, b) => a.position - b.position
    ),

    days: [...(program.days ?? [])]
      .filter((day) => day.is_published)
      .sort(
        (a, b) => a.position - b.position
      )
      .map((day) => ({
        id: day.id,
        day_number: day.day_number,
        title: day.title,
        description: day.description,
        position: day.position,
        is_published: day.is_published,

        modules: [...(day.modules ?? [])]
          .sort(
            (a, b) => a.position - b.position
          )
          .map((module) => ({
            id: module.id,
            title: "",
            description: null,
            objective: null,
            duration_minutes:
              module.duration_minutes,
            position: module.position,
            is_required:
              module.is_required,

            materials: [],
            activities: [],
            quizzes: [],
          })),
      })),
  } satisfies LearnerProgram;

  console.log(
    `[PROGRAM PERF] TOTAL getLearnerProgram: ${Math.round(
      performance.now() - totalStart
    )}ms`
  );

  return normalized;
}