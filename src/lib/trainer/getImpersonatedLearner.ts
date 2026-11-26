import { createClient } from "@/lib/supabase/server";
import type { ProgressMap } from "@/lib/learning/types";
import type { LearnerJourney } from "@/components/layout/AppShell";
import { notFound } from "next/navigation";
import { getLearnerProgram } from "@/lib/learning/getLearnerProgram";

type JourneyDayRow = {
  id: string;
  day_number: number;
  title: string;
  unlocked: boolean;
  completed: boolean;
};

export async function resolvePreviewProgram(learnerId: string, requested?: string) {
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) notFound();
  const {data: trainer} = await supabase.from("profiles").select("role,account_status").eq("id",user.id).maybeSingle();
  if (trainer?.role !== "trainer" || trainer.account_status !== "active") notFound();
  const {data: learner} = await supabase.from("profiles").select("role,active_program_id").eq("id",learnerId).maybeSingle();
  const programId = requested ?? learner?.active_program_id;
  if (!learner || learner.role === "trainer" || !programId) notFound();
  const {data: enrollment} = await supabase.from("program_enrollments").select("program_id").eq("program_id",programId).eq("learner_id",learnerId).maybeSingle();
  const {data: program} = await supabase.from("programs").select("id").eq("id",programId).eq("status","published").maybeSingle();
  if (!enrollment || !program) notFound();
  return programId as string;
}

export async function getPreviewProgram(learnerId:string, programId:string) {
  await resolvePreviewProgram(learnerId,programId);
  return getLearnerProgram({programId,learnerId});
}

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
      supabase.rpc("get_trainer_learner_setup_progress", {target_program_id:programId,target_learner_id:learnerId}),

      supabase.rpc(
        "get_trainer_impersonated_progress",
        {
          target_program_id: programId,
          target_learner_id: learnerId,
        }
      ),
    ]);

  if (setupResult.error) {
    throw new Error("Unable to load learner preview setup progress.");
  }

  if (progressResult.error) {
    throw new Error("Unable to load learner preview progress.");
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
      ((setupResult.data ?? []) as {setup_item_id:string;completed:boolean}[]).map(
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
  programId: string,
  options: {
    setupCompleted?: number;
    setupTotal?: number;
  } = {}
): Promise<LearnerJourney | undefined> {
  if (!learnerId) {
    return undefined;
  }

  await resolvePreviewProgram(learnerId,programId);
  const supabase = await createClient();

  // ---------------------------------------------------------
  // LOAD TRAINEE JOURNEY DAYS
  // ---------------------------------------------------------

  const { data, error } = await supabase.rpc(
    "get_trainer_impersonated_journey_days",
    {
      target_program_id: programId,
      target_learner_id: learnerId,
    }
  );

  if (error) {
    console.error(
      "Unable to load impersonated trainee journey:",
      error
    );

    throw new Error("Unable to load learner preview journey.");
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
    .eq("id", programId)
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

  const {data: setup,error: setupError} = await supabase.rpc("get_trainer_learner_setup_progress",{target_program_id:programId,target_learner_id:learnerId});
  if (setupError) throw new Error("Unable to load learner setup progress.");
  const required = ((setup ?? []) as {is_required:boolean;completed:boolean}[]).filter(x=>x.is_required);
  return {
    setupCompleted: options.setupCompleted ?? required.filter(x=>x.completed).length,
    setupTotal: options.setupTotal ?? required.length,

    days,

    certificationUnlocked,
  };
}