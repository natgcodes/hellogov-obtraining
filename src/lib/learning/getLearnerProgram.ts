import { createClient } from "@/lib/supabase/server";
import type { LearnerProgram } from "./types";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";

export async function getLearnerProgram(): Promise<LearnerProgram | null> {
  const totalStart = performance.now();

  const supabase = await createClient();

  // ---------------------------------------------------------
  // LOAD ONLY THE DATA REQUIRED BY /learn
  //
  // The overview does NOT need materials, activities,
  // quizzes, objectives, etc. Those are loaded by the
  // individual day page when the learner opens a day.
  // ---------------------------------------------------------

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
    .eq("id", HELLOGOV_PROGRAM_ID)
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
    return null;
  }

  // ---------------------------------------------------------
  // NORMALIZE SETUP SECTION
  //
  // setup_sections is one-to-one through the unique
  // program_id constraint. Depending on Supabase's generated
  // relationship shape, normalize either object or array.
  // ---------------------------------------------------------

  const rawSetupSection =
    program.setup_sections;

  const setupSection = Array.isArray(
    rawSetupSection
  )
    ? rawSetupSection[0] ?? null
    : rawSetupSection ?? null;

  // ---------------------------------------------------------
  // NORMALIZE
  // ---------------------------------------------------------

  const normalized = {
    id: program.id,
    title: program.title,
    description: program.description,
    status: program.status,

    setup_section: setupSection
      ? {
          id: setupSection.id,
          program_id:
            setupSection.program_id,
          title: setupSection.title,
          description:
            setupSection.description,
          instructions:
            setupSection.instructions,
        }
      : null,

    setup_items: [
      ...(program.setup_items ?? []),
    ].sort(
      (a, b) =>
        a.position - b.position
    ),

    days: [...(program.days ?? [])]
      .filter((day) => day.is_published)
      .sort(
        (a, b) =>
          a.position - b.position
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
            (a, b) =>
              a.position - b.position
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

            // The overview does not need these.
            // They remain present so LearnerProgram keeps
            // its existing shape and other code does not
            // break.
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