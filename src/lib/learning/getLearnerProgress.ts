import { createClient } from "@/lib/supabase/server";
import type { ProgressMap } from "./types";

function emptyProgress(): ProgressMap {
  return {
    setup: {},
    materials: {},
    activities: {},
    modules: {},
    percent: 0,
  };
}

export async function getLearnerProgress(
  programId: string,
  learnerId: string
): Promise<ProgressMap> {
  const totalStart = performance.now();

  function logPerf(label: string, start: number) {
    console.log(
      `[PROGRESS PERF] ${label}: ${Math.round(
        performance.now() - start
      )}ms`
    );
  }

  if (!learnerId) {
    console.error(
      "Unable to load learner progress: learnerId is missing"
    );

    return emptyProgress();
  }

  if (!programId) {
    console.error(
      "Unable to load learner progress: programId is missing"
    );

    return emptyProgress();
  }

  const supabase = await createClient();

  // ---------------------------------------------------------
  // LOAD ONLY THE PROGRESS NEEDED BY /learn
  //
  // Overview only uses:
  // - progress.setup
  // - progress.percent
  //
  // Module/material/activity progress is loaded on the
  // individual day pages instead.
  // ---------------------------------------------------------

  const queryStart = performance.now();

  const [
    setupResult,
    progressResult,
  ] = await Promise.all([
    supabase
      .from("learner_setup_progress")
      .select("setup_item_id, completed")
      .eq("learner_id", learnerId),

    supabase.rpc("get_program_progress", {
      target_program_id: programId,
    }),
  ]);

  logPerf(
    "overview progress queries",
    queryStart
  );

  // ---------------------------------------------------------
  // ERROR LOGGING
  // ---------------------------------------------------------

  if (setupResult.error) {
    console.error(
      "Unable to load setup progress:",
      setupResult.error
    );
  }

  if (progressResult.error) {
    console.error(
      "Unable to calculate program progress:",
      progressResult.error
    );
  }

  // ---------------------------------------------------------
  // NORMALIZE PROGRESS
  // ---------------------------------------------------------

  const rawPercent = Number(
    progressResult.data ?? 0
  );

  const percent = Number.isFinite(rawPercent)
    ? Math.min(
        100,
        Math.max(0, rawPercent)
      )
    : 0;

  const result: ProgressMap = {
    setup: Object.fromEntries(
      (setupResult.data ?? []).map(
        (item) => [
          item.setup_item_id,
          item.completed === true,
        ]
      )
    ),

    materials: {},
    activities: {},
    modules: {},
    percent,
  };

  logPerf(
    "TOTAL getLearnerProgress",
    totalStart
  );

  return result;
}