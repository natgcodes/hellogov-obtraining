import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import LearnerModuleCard from "@/components/learning/LearnerModuleCard";
import { createClient } from "@/lib/supabase/server";
import type {
  LearnerModule,
  ProgressMap,
} from "@/lib/learning/types";

type Props = {
  params: Promise<{
    dayId: string;
  }>;
};

export default async function LearnerDayPage({ params }: Props) {
  const { dayId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "trainer") {
    redirect("/trainer");
  }

  // ---------------------------------------------------------
  // Check access
  // ---------------------------------------------------------

  const { data: unlocked, error: unlockError } =
    await supabase.rpc("is_day_unlocked", {
      target_day_id: dayId,
    });

  if (unlockError) {
    console.error("Unable to check day access:", unlockError);
    redirect("/learn");
  }

  if (!unlocked) {
    redirect("/learn");
  }

  // ---------------------------------------------------------
  // Load day content
  // ---------------------------------------------------------

  const { data: day, error: dayError } = await supabase
    .from("days")
    .select(`
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
    `)
    .eq("id", dayId)
    .eq("is_published", true)
    .single();

  if (dayError || !day) {
    notFound();
  }

  // ---------------------------------------------------------
  // Normalize and sort nested content
  // ---------------------------------------------------------

  const modules: LearnerModule[] = (day.modules ?? [])
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
    }))
    .sort((a, b) => a.position - b.position);

  // ---------------------------------------------------------
  // Collect content IDs
  // ---------------------------------------------------------

  const moduleIds = modules.map((module) => module.id);

  const materialIds = modules.flatMap((module) =>
    module.materials.map((material) => material.id)
  );

  const activityIds = modules.flatMap((module) =>
    module.activities.map((activity) => activity.id)
  );

  // ---------------------------------------------------------
  // Load learner progress
  // ---------------------------------------------------------

  const [
    moduleProgressResult,
    materialProgressResult,
    activityProgressResult,
  ] = await Promise.all([
    moduleIds.length > 0
      ? supabase
          .from("learner_module_progress")
          .select("module_id, status")
          .eq("learner_id", user.id)
          .in("module_id", moduleIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    materialIds.length > 0
      ? supabase
          .from("learner_material_progress")
          .select("material_id, completed")
          .eq("learner_id", user.id)
          .in("material_id", materialIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    activityIds.length > 0
      ? supabase
          .from("learner_activity_progress")
          .select("activity_id, status")
          .eq("learner_id", user.id)
          .in("activity_id", activityIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  // ---------------------------------------------------------
  // Build the ProgressMap expected by LearnerModuleCard
  // ---------------------------------------------------------

  const progress: ProgressMap = {
    setup: {},
    percent: 0,
    modules: Object.fromEntries(
      (moduleProgressResult.data ?? []).map((item) => [
        item.module_id,
        item.status,
      ])
    ),

    materials: Object.fromEntries(
      (materialProgressResult.data ?? []).map((item) => [
        item.material_id,
        item.completed,
      ])
    ),

    activities: Object.fromEntries(
      (activityProgressResult.data ?? []).map((item) => [
        item.activity_id,
        item.status,
      ])
    ),
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <AppShell role="learner">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/learn"
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to overview
        </Link>

        <header className="mt-7 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
            Day {day.day_number}
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {day.title}
          </h1>

          {day.description && (
            <p className="mt-3 max-w-3xl leading-7 text-slate-500">
              {day.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              {modules.length}{" "}
              {modules.length === 1 ? "module" : "modules"}
            </span>

            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              Available
            </span>
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Training Content
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Today&apos;s modules
            </h2>
          </div>

          {modules.length > 0 ? (
            <div className="space-y-5">
              {modules.map((module) => (
                <LearnerModuleCard
                  key={module.id}
                  module={module}
                  progress={progress}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h3 className="font-semibold text-slate-900">
                No modules available yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Training content for this day has not been added yet.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}