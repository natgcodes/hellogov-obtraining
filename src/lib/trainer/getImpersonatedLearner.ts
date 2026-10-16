import { createClient } from "@/lib/supabase/server";
import type { ProgressMap } from "@/lib/learning/types";
import type { LearnerJourney } from "@/components/layout/AppShell";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";

type JourneyDayRow = {
  id: string;
  day_number: number;
  title: string;
  unlocked: boolean;
  completed: boolean;
};

function emptyProgress(): ProgressMap {
  return {
    setup: {},
    materials: {},
    activities: {},
    quizzes: {},
    manuallyCompletedQuizzes: {},
    modules: {},
    percent: 0,
  };
}

// ============================================================
// IMPERSONATED TRAINEE PROGRESS
// ============================================================

export async function getImpersonatedLearnerProgress(
  programId: string,
  learnerId: string
): Promise<ProgressMap> {
  if (!programId || !learnerId) {
    return emptyProgress();
  }

  const supabase = await createClient();

  const [setupResult, progressResult] =
    await Promise.all([
      supabase
        .from("learner_setup_progress")
        .select("setup_item_id, completed")
        .eq("learner_id", learnerId),

      supabase.rpc(
        "get_trainer_impersonated_progress",
        {
          target_program_id: programId,
          target_learner_id: learnerId,
        }
      ),
    ]);

  if (setupResult.error) {
    console.error(
      "Unable to load impersonated trainee setup progress:",
      setupResult.error
    );
  }

  if (progressResult.error) {
    console.error(
      "Unable to load impersonated trainee progress:",
      progressResult.error
    );
  }

  const rawPercent = Number(
    progressResult.data ?? 0
  );

  const percent = Number.isFinite(rawPercent)
    ? Math.min(
        100,
        Math.max(0, rawPercent)
      )
    : 0;

  return {
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
    quizzes: {},
    manuallyCompletedQuizzes: {},
    modules: {},
    percent,
  };
}

// ============================================================
// IMPERSONATED TRAINEE JOURNEY
// ============================================================

export async function getImpersonatedLearnerJourney(
  learnerId: string,
  options: {
    setupCompleted?: number;
    setupTotal?: number;
  } = {}
): Promise<LearnerJourney | undefined> {
  if (!learnerId) {
    return undefined;
  }

  const supabase = await createClient();

  // ---------------------------------------------------------
  // LOAD TRAINEE JOURNEY DAYS
  // ---------------------------------------------------------

  const { data, error } = await supabase.rpc(
    "get_trainer_impersonated_journey_days",
    {
      target_program_id: HELLOGOV_PROGRAM_ID,
      target_learner_id: learnerId,
    }
  );

  if (error) {
    console.error(
      "Unable to load impersonated trainee journey:",
      error
    );

    return undefined;
  }

  // ---------------------------------------------------------
  // NORMALIZE DAY STATES
  // ---------------------------------------------------------

  const rows = (data ?? []) as JourneyDayRow[];

  const days = rows.map((day) => ({
    id: day.id,
    dayNumber: day.day_number,
    title: day.title,
    unlocked: day.unlocked,
    completed: day.completed,
  }));

  // ---------------------------------------------------------
  // GLOBAL CERTIFICATION ACCESS
  //
  // Certification requires BOTH:
  // 1. All training days completed.
  // 2. Trainer-enabled access for the program.
  //
  // If the settings cannot be retrieved,
  // certification remains locked.
  // ---------------------------------------------------------

  const {
    data: programSettings,
    error: settingsError,
  } = await supabase
    .from("programs")
    .select("certification_enabled")
    .eq("id", HELLOGOV_PROGRAM_ID)
    .maybeSingle();

  if (settingsError) {
    console.error(
      "Unable to load certification access for impersonated trainee:",
      settingsError
    );
  }

  const certificationEnabled =
    programSettings?.certification_enabled === true;

  const allDaysCompleted =
    days.length > 0 &&
    days.every((day) => day.completed);

  const certificationUnlocked =
    certificationEnabled && allDaysCompleted;

  // ---------------------------------------------------------
  // RESULT
  // ---------------------------------------------------------

  return {
    setupCompleted:
      options.setupCompleted ?? 0,

    setupTotal:
      options.setupTotal ?? 0,

    days,

    certificationUnlocked,
  };
}