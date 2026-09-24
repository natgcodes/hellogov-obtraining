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

type LearnerCheckpoint = {
  id: string;
  title: string;
  description: string | null;
  checkpoint_type: string;
  passing_score: number | null;
  position: number;
  quiz_id: string | null;
};

type CheckpointResult = {
  checkpoint_id: string;
  status: string;
  score: number | null;
  passed: boolean | null;
  trainer_feedback: string | null;
  submitted_at: string | null;
  graded_at: string | null;
};

function getCheckpointTypeLabel(type: string) {
  const labels: Record<string, string> = {
    knowledge: "Knowledge",
    practical: "Practical",
    mock_call: "Mock Call",
    trainer_review: "Trainer Review",
    other: "Checkpoint",
  };

  return labels[type] ?? "Checkpoint";
}

function getCheckpointStatus(result?: CheckpointResult) {
  if (!result) {
    return {
      label: "Not started",
      className: "bg-slate-100 text-slate-600",
    };
  }

  if (result.status === "graded") {
    if (result.passed === true) {
      return {
        label: "Passed",
        className: "bg-green-50 text-green-700",
      };
    }

    if (result.passed === false) {
      return {
        label: "Not passed",
        className: "bg-red-50 text-red-700",
      };
    }

    return {
      label: "Graded",
      className: "bg-blue-50 text-blue-700",
    };
  }

  if (
    result.status === "submitted" ||
    result.status === "pending_review" ||
    result.status === "pending"
  ) {
    return {
      label: "Submitted",
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (result.status === "in_progress") {
    return {
      label: "In progress",
      className: "bg-purple-50 text-purple-700",
    };
  }

  return {
    label: result.status.replaceAll("_", " "),
    className: "bg-slate-100 text-slate-600",
  };
}

export default async function LearnerDayPage({
  params,
}: Props) {
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
    .select("full_name, email, role")
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
    console.error(
      "Unable to check day access:",
      unlockError
    );
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
      ),

      checkpoints (
        id,
        title,
        description,
        checkpoint_type,
        passing_score,
        position,
        quiz_id
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

  const checkpoints: LearnerCheckpoint[] = [
    ...(day.checkpoints ?? []),
  ].sort((a, b) => a.position - b.position);

  // ---------------------------------------------------------
  // Collect content IDs
  // ---------------------------------------------------------

  const moduleIds = modules.map(
    (module) => module.id
  );

  const materialIds = modules.flatMap(
    (module) =>
      module.materials.map(
        (material) => material.id
      )
  );

  const activityIds = modules.flatMap(
    (module) =>
      module.activities.map(
        (activity) => activity.id
      )
  );

  const checkpointIds = checkpoints.map(
    (checkpoint) => checkpoint.id
  );

  // ---------------------------------------------------------
  // Load learner progress + checkpoint results
  // ---------------------------------------------------------

  const [
    moduleProgressResult,
    materialProgressResult,
    activityProgressResult,
    checkpointResultsResult,
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

    checkpointIds.length > 0
      ? supabase
          .from("checkpoint_results")
          .select(`
            checkpoint_id,
            status,
            score,
            passed,
            trainer_feedback,
            submitted_at,
            graded_at
          `)
          .eq("learner_id", user.id)
          .in("checkpoint_id", checkpointIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  // ---------------------------------------------------------
  // Build progress map
  // ---------------------------------------------------------

  const progress: ProgressMap = {
    setup: {},
    percent: 0,

    modules: Object.fromEntries(
      (moduleProgressResult.data ?? []).map(
        (item) => [
          item.module_id,
          item.status,
        ]
      )
    ),

    materials: Object.fromEntries(
      (materialProgressResult.data ?? []).map(
        (item) => [
          item.material_id,
          item.completed,
        ]
      )
    ),

    activities: Object.fromEntries(
      (activityProgressResult.data ?? []).map(
        (item) => [
          item.activity_id,
          item.status,
        ]
      )
    ),
  };

  const checkpointResults = new Map<
    string,
    CheckpointResult
  >(
    (
      (checkpointResultsResult.data ??
        []) as CheckpointResult[]
    ).map((result) => [
      result.checkpoint_id,
      result,
    ])
  );

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <AppShell
      role="learner"
      userName={profile.full_name}
      userEmail={profile.email}
    >
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
              {modules.length === 1
                ? "module"
                : "modules"}
            </span>

            {checkpoints.length > 0 && (
              <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">
                {checkpoints.length}{" "}
                {checkpoints.length === 1
                  ? "checkpoint"
                  : "checkpoints"}
              </span>
            )}

            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              Available
            </span>
          </div>
        </header>

        {/* -------------------------------------------------
            MODULES
        -------------------------------------------------- */}

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
                Training content for this day has
                not been added yet.
              </p>
            </div>
          )}
        </section>

        {/* -------------------------------------------------
            CHECKPOINTS
        -------------------------------------------------- */}

        {checkpoints.length > 0 && (
          <section className="mt-10">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
                Checkpoints
              </p>

              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Complete today&apos;s checkpoints
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Complete the required assessments
                before finishing this training day.
              </p>
            </div>

            <div className="space-y-4">
              {checkpoints.map(
                (checkpoint, index) => {
                  const result =
                    checkpointResults.get(
                      checkpoint.id
                    );

                  const status =
                    getCheckpointStatus(result);

                  return (
                    <article
                      key={checkpoint.id}
                      className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#f3f0ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6847df]">
                              Checkpoint{" "}
                              {index + 1}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                              {getCheckpointTypeLabel(
                                checkpoint.checkpoint_type
                              )}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <h3 className="mt-3 text-lg font-semibold text-slate-950">
                            {checkpoint.title}
                          </h3>

                          {checkpoint.description && (
                            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
                              {
                                checkpoint.description
                              }
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                            {checkpoint.passing_score !==
                              null && (
                              <span>
                                Passing score:{" "}
                                {
                                  checkpoint.passing_score
                                }
                                %
                              </span>
                            )}

                            {result?.score !== null &&
                              result?.score !==
                                undefined && (
                                <span>
                                  Score:{" "}
                                  {Number(
                                    result.score
                                  ).toFixed(0)}
                                  %
                                </span>
                              )}
                          </div>

                          {result?.trainer_feedback && (
                            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Trainer feedback
                              </p>

                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                {
                                  result.trainer_feedback
                                }
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {checkpoint.quiz_id ? (
                            <Link
                              href={`/learn/quiz/${checkpoint.quiz_id}`}
                              className="inline-flex rounded-xl bg-[#6847df] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5925dc]"
                            >
                              {result
                                ? "View checkpoint"
                                : "Start checkpoint"}
                            </Link>
                          ) : (
                            <span className="inline-flex rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400">
                              Not available
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}