import { createClient } from "@/lib/supabase/server";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";
import type { LearnerJourney } from "@/components/layout/AppShell";

type JourneyDayRow = {
  id: string;
  day_number: number;
  title: string;
  unlocked: boolean;
  completed: boolean;
};

type LearnerJourneyOptions = {
  setupCompleted?: number;
  setupTotal?: number;
};

export async function getLearnerJourney(
  learnerId: string,
  options: LearnerJourneyOptions = {}
): Promise<LearnerJourney | undefined> {
  const totalStart = performance.now();

  function logPerf(
    label: string,
    start: number
  ) {
    console.log(
      `[JOURNEY PERF] ${label}: ${Math.round(
        performance.now() - start
      )}ms`
    );
  }

  // ---------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------

  if (!learnerId) {
    console.error(
      "Unable to load learner journey: learnerId is missing"
    );

    return undefined;
  }

  const supabase = await createClient();

  // ---------------------------------------------------------
  // JOURNEY DAY STATES
  //
  // This is now the only database query required here.
  // Program/setup information is already available on
  // LearnPage through getLearnerProgram + getLearnerProgress.
  // ---------------------------------------------------------

  const journeyStart = performance.now();

  const {
    data: journeyDaysData,
    error: journeyDaysError,
  } = await supabase.rpc(
    "get_learner_journey_days",
    {
      target_program_id:
        HELLOGOV_PROGRAM_ID,
    }
  );

  logPerf(
    "journey days RPC",
    journeyStart
  );

  // ---------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------

  if (journeyDaysError) {
    console.error(
      "Unable to load learner journey day states:",
      journeyDaysError
    );

    return undefined;
  }

  // ---------------------------------------------------------
  // NORMALIZE DAY STATES
  // ---------------------------------------------------------

  const journeyRows =
    (journeyDaysData ??
      []) as JourneyDayRow[];

  const dayStates =
    journeyRows.map((day) => ({
      id: day.id,
      dayNumber:
        day.day_number,
      title:
        day.title,
      unlocked:
        day.unlocked,
      completed:
        day.completed,
    }));

  // ---------------------------------------------------------
  // CERTIFICATION
  // ---------------------------------------------------------

  const certificationUnlocked =
    dayStates.length > 0 &&
    dayStates.every(
      (day) => day.completed
    );

  // ---------------------------------------------------------
  // FINAL PERFORMANCE
  // ---------------------------------------------------------

  logPerf(
    "TOTAL getLearnerJourney",
    totalStart
  );

  // ---------------------------------------------------------
  // RESULT
  // ---------------------------------------------------------

  return {
    setupCompleted:
      options.setupCompleted ?? 0,

    setupTotal:
      options.setupTotal ?? 0,

    days:
      dayStates,

    certificationUnlocked,
  };
}