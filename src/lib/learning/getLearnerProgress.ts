import { createClient } from "@/lib/supabase/server";
import type { ProgressMap } from "./types";

export async function getLearnerProgress(
  programId: string
): Promise<ProgressMap> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      setup: {},
      materials: {},
      activities: {},
      modules: {},
      percent: 0,
    };
  }

  const [
    setupResult,
    materialResult,
    activityResult,
    moduleResult,
    progressResult,
  ] = await Promise.all([
    supabase
      .from("learner_setup_progress")
      .select("setup_item_id, completed")
      .eq("learner_id", user.id),

    supabase
      .from("learner_material_progress")
      .select("material_id, completed")
      .eq("learner_id", user.id),

    supabase
      .from("learner_activity_progress")
      .select("activity_id, status")
      .eq("learner_id", user.id),

    supabase
      .from("learner_module_progress")
      .select("module_id, status")
      .eq("learner_id", user.id),

    supabase.rpc("get_program_progress", {
      target_program_id: programId,
    }),
  ]);

  return {
    setup: Object.fromEntries(
      (setupResult.data ?? []).map((item) => [
        item.setup_item_id,
        item.completed,
      ])
    ),

    materials: Object.fromEntries(
      (materialResult.data ?? []).map((item) => [
        item.material_id,
        item.completed,
      ])
    ),

    activities: Object.fromEntries(
      (activityResult.data ?? []).map((item) => [
        item.activity_id,
        item.status,
      ])
    ),

    modules: Object.fromEntries(
      (moduleResult.data ?? []).map((item) => [
        item.module_id,
        item.status,
      ])
    ),

    percent: Number(progressResult.data ?? 0),
  };
}