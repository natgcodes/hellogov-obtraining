import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import CheckpointCompletionButton from "@/components/learning/CheckpointCompletionButton";
import LearnerModuleCard from "@/components/learning/LearnerModuleCard";
import ModuleNotes from "@/components/learning/ModuleNotes";
import DualDateTime from "@/components/ui/DualDateTime";
import { getLearnerJourney } from "@/lib/learning/getLearnerJourney";
import type {
  LearnerModule,
  ProgressMap,
} from "@/lib/learning/types";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    dayId: string;
  }>;
};

type CheckpointType =
  | "assessment"
  | "trainer_session"
  | "information";

type LearnerCheckpoint = {
  id: string;
  title: string;
  description: string | null;
  checkpoint_type: CheckpointType;
  passing_score: number | null;
  position: number;
  quiz_id: string | null;
  is_required: boolean;
  allow_learner_completion: boolean;
  meeting_url: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
};

type DayContentRow = {
  id: string;
  content_type:
    | "module"
    | "checkpoint";
  content_id: string;
  position: number;
};

type OrderedDayContent =
  | {
      type: "module";
      id: string;
      position: number;
      module: LearnerModule;
    }
  | {
      type: "checkpoint";
      id: string;
      position: number;
      checkpoint: LearnerCheckpoint;
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

type DayProgressData = {
  modules?: Array<{
    module_id: string;
    status: string;
  }>;

  materials?: Array<{
    material_id: string;
    completed: boolean;
  }>;

  activities?: Array<{
    activity_id: string;
    status: string;
  }>;

  quizzes?: Array<{
    quiz_id: string;
    completed: boolean;
  }>;

  checkpoints?: CheckpointResult[];
};

function getCheckpointTypeLabel(
  type: CheckpointType
) {
  const labels: Record<
    CheckpointType,
    string
  > = {
    assessment: "Checkpoint",
    trainer_session: "Live Session",
    information: "Information",
  };

  return labels[type];
}

function getCheckpointEyebrow(
  type: CheckpointType
) {
  const labels: Record<
    CheckpointType,
    string
  > = {
    assessment: "CHECKPOINT",
    trainer_session: "LIVE SESSION",
    information: "INFORMATION",
  };

  return labels[type];
}

function getCheckpointStatus(
  result?: CheckpointResult
) {
  if (!result) {
    return {
      label: "Not started",
      className:
        "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    };
  }

  if (result.status === "completed") {
    if (result.passed === true) {
      return {
        label: "Passed",
        className:
          "bg-[var(--success-soft)] text-[var(--success)]",
      };
    }

    if (result.passed === false) {
      return {
        label: "Not passed",
        className:
          "bg-[var(--hellogov-red-soft)] text-[var(--hellogov-red)]",
      };
    }

    return {
      label: "Completed",
      className:
        "bg-[var(--success-soft)] text-[var(--success)]",
    };
  }

  if (result.status === "needs_review") {
    return {
      label: "Pending review",
      className:
        "bg-[var(--warning-soft)] text-[var(--warning)]",
    };
  }

  if (result.status === "pending") {
    return {
      label: "In progress",
      className:
        "bg-[var(--teal-soft)] text-[var(--teal-deep)]",
    };
  }

  return {
    label: result.status.replaceAll(
      "_",
      " "
    ),
    className:
      "bg-[var(--surface-muted)] text-[var(--text-muted)]",
  };
}

function isCheckpointCompleted(
  result?: CheckpointResult
) {
  return (
    result?.status === "completed"
  );
}

function formatDuration(
  minutes: number
) {
  if (minutes <= 0) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const remaining =
    minutes % 60;

  if (remaining === 0) {
    return `${hours} ${
      hours === 1 ? "hr" : "hrs"
    }`;
  }

  return `${hours}h ${remaining}m`;
}

export default async function LearnerDayPage({
  params,
}: Props) {
  const totalStart =
    performance.now();

  function logPerf(
    label: string,
    start: number
  ) {
    console.log(
      `[DAY PERF] ${label}: ${Math.round(
        performance.now() - start
      )}ms`
    );
  }

  const timed = async <T,>(
    label: string,
    promise: PromiseLike<T>
  ): Promise<T> => {
    const start =
      performance.now();

    const result =
      await promise;

    logPerf(label, start);

    return result;
  };

  const { dayId } =
    await params;

  const supabase =
    await createClient();

  // ---------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------

  const authStart =
    performance.now();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  logPerf(
    "auth.getUser",
    authStart
  );

  if (!user) {
    redirect("/login");
  }

  // ---------------------------------------------------------
  // PARALLEL PAGE DATA
  // ---------------------------------------------------------

  const parallelStart =
    performance.now();

  const profilePromise = timed(
    "profile",
    supabase
      .from("profiles")
      .select(
        "full_name, email, role"
      )
      .eq("id", user.id)
      .single()
  );

  const journeyPromise = timed(
    "getLearnerJourney",
    getLearnerJourney(user.id)
  );

  const dayPromise = timed(
    "day content query",
    supabase
      .from("days")
      .select(`
        id,
        day_number,
        title,
        description,
        position,
        is_published,

        day_content (
          id,
          content_type,
          content_id,
          position
        ),

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
            resource_url,
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
          quiz_id,
          is_required,
          allow_learner_completion,
          meeting_url,
          scheduled_at,
          duration_minutes
        )
      `)
      .eq("id", dayId)
      .eq("is_published", true)
      .single()
  );

  const dayProgressPromise =
    timed(
      "get_learner_day_progress",
      supabase.rpc(
        "get_learner_day_progress",
        {
          target_day_id: dayId,
        }
      )
    );

  const [
    profileResult,
    learnerJourney,
    dayResult,
    dayProgressResult,
  ] = await Promise.all([
    profilePromise,
    journeyPromise,
    dayPromise,
    dayProgressPromise,
  ]);

  logPerf(
    "parallel data TOTAL",
    parallelStart
  );

  // ---------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------

  const {
    data: profile,
    error: profileError,
  } = profileResult;

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "Unable to load learner profile:",
      profileError
    );

    redirect("/login");
  }

  if (
    profile.role === "trainer"
  ) {
    redirect("/trainer");
  }

  // ---------------------------------------------------------
  // JOURNEY
  // ---------------------------------------------------------

  if (!learnerJourney) {
    redirect("/learn");
  }

  const currentJourneyDay =
    learnerJourney.days.find(
      (journeyDay) =>
        journeyDay.id === dayId
    );

  if (!currentJourneyDay) {
    notFound();
  }

  if (
    !currentJourneyDay.unlocked &&
    !currentJourneyDay.completed
  ) {
    redirect("/learn");
  }

  const dayCompleted =
    currentJourneyDay.completed;

  // ---------------------------------------------------------
  // DAY
  // ---------------------------------------------------------

  const {
    data: day,
    error: dayError,
  } = dayResult;

  if (
    dayError ||
    !day
  ) {
    notFound();
  }

  // ---------------------------------------------------------
  // NORMALIZE MODULES
  // ---------------------------------------------------------

  const modules: LearnerModule[] = (
    day.modules ?? []
  ).map((module) => ({
    ...module,

    materials: [
      ...(module.materials ?? []),
    ].sort(
      (a, b) =>
        a.position - b.position
    ),

    activities: [
      ...(module.activities ?? []),
    ].sort(
      (a, b) =>
        a.position - b.position
    ),

    quizzes: [
      ...(module.quizzes ?? []),
    ]
      .filter(
        (quiz) =>
          quiz.is_published
      )
      .sort(
        (a, b) =>
          a.position - b.position
      ),
  }));

  const checkpoints: LearnerCheckpoint[] =
    (day.checkpoints ??
      []) as LearnerCheckpoint[];

  const dayContent: DayContentRow[] =
    [
      ...(day.day_content ?? []),
    ].sort(
      (a, b) =>
        a.position - b.position
    ) as DayContentRow[];

  // ---------------------------------------------------------
  // INTERLEAVED CONTENT
  // ---------------------------------------------------------

  const moduleMap =
    new Map(
      modules.map((module) => [
        module.id,
        module,
      ])
    );

  const checkpointMap =
    new Map(
      checkpoints.map(
        (checkpoint) => [
          checkpoint.id,
          checkpoint,
        ]
      )
    );

  const orderedContent:
    OrderedDayContent[] = [];

  for (const content of dayContent) {
    if (
      content.content_type ===
      "module"
    ) {
      const module =
        moduleMap.get(
          content.content_id
        );

      if (!module) {
        continue;
      }

      orderedContent.push({
        type: "module",
        id: content.id,
        position: content.position,
        module,
      });

      continue;
    }

    if (
      content.content_type ===
      "checkpoint"
    ) {
      const checkpoint =
        checkpointMap.get(
          content.content_id
        );

      if (!checkpoint) {
        continue;
      }

      orderedContent.push({
        type: "checkpoint",
        id: content.id,
        position: content.position,
        checkpoint,
      });
    }
  }

  // Legacy fallback

  const orderedModuleIds =
    new Set(
      orderedContent
        .filter(
          (content) =>
            content.type ===
            "module"
        )
        .map(
          (content) =>
            content.module.id
        )
    );

  const orderedCheckpointIds =
    new Set(
      orderedContent
        .filter(
          (content) =>
            content.type ===
            "checkpoint"
        )
        .map(
          (content) =>
            content.checkpoint.id
        )
    );

  const legacyModules =
    modules
      .filter(
        (module) =>
          !orderedModuleIds.has(
            module.id
          )
      )
      .sort(
        (a, b) =>
          a.position -
          b.position
      );

  const legacyCheckpoints =
    checkpoints
      .filter(
        (checkpoint) =>
          !orderedCheckpointIds.has(
            checkpoint.id
          )
      )
      .sort(
        (a, b) =>
          a.position -
          b.position
      );

  let fallbackPosition =
    orderedContent.length > 0
      ? Math.max(
          ...orderedContent.map(
            (content) =>
              content.position
          )
        ) + 1
      : 0;

  for (
    const module of legacyModules
  ) {
    orderedContent.push({
      type: "module",
      id: `legacy-module-${module.id}`,
      position:
        fallbackPosition++,
      module,
    });
  }

  for (
    const checkpoint of legacyCheckpoints
  ) {
    orderedContent.push({
      type: "checkpoint",
      id: `legacy-checkpoint-${checkpoint.id}`,
      position:
        fallbackPosition++,
      checkpoint,
    });
  }

  orderedContent.sort(
    (a, b) =>
      a.position - b.position
  );

  const moduleNumbers =
    new Map<string, number>();

  let moduleCounter = 0;

  for (
    const content of orderedContent
  ) {
    if (
      content.type === "module"
    ) {
      moduleCounter += 1;

      moduleNumbers.set(
        content.module.id,
        moduleCounter
      );
    }
  }

  const checkpointNumbers =
    new Map<string, number>();

  let checkpointCounter = 0;

  for (
    const content of orderedContent
  ) {
    if (
      content.type ===
        "checkpoint" &&
      content.checkpoint
        .checkpoint_type ===
        "assessment"
    ) {
      checkpointCounter += 1;

      checkpointNumbers.set(
        content.checkpoint.id,
        checkpointCounter
      );
    }
  }

  // ---------------------------------------------------------
  // DAY PROGRESS
  // ---------------------------------------------------------

  const {
    data: dayProgressData,
    error: dayProgressError,
  } = dayProgressResult;

  if (dayProgressError) {
    console.error(
      "Unable to load learner day progress:",
      dayProgressError
    );
  }

  const normalizedDayProgress =
    (dayProgressData ??
      {}) as DayProgressData;

  const moduleProgress =
    normalizedDayProgress.modules ??
    [];

  const materialProgress =
    normalizedDayProgress
      .materials ?? [];

  const activityProgress =
  normalizedDayProgress.activities ?? [];

const quizProgress =
  normalizedDayProgress.quizzes ?? [];

const checkpointProgress =
  normalizedDayProgress.checkpoints ?? [];

  const progress: ProgressMap = {
  setup: {},
  percent: 0,

  modules: Object.fromEntries(
    moduleProgress.map((item) => [
      item.module_id,
      item.status,
    ])
  ),

  materials: Object.fromEntries(
    materialProgress.map((item) => [
      item.material_id,
      item.completed,
    ])
  ),

  activities: Object.fromEntries(
    activityProgress.map((item) => [
      item.activity_id,
      item.status,
    ])
  ),

  quizzes: Object.fromEntries(
    quizProgress.map((item) => [
      item.quiz_id,
      item.completed,
    ])
  ),
};

  const checkpointResults =
    new Map<
      string,
      CheckpointResult
    >(
      checkpointProgress.map(
        (result) => [
          result.checkpoint_id,
          result,
        ]
      )
    );

  // ---------------------------------------------------------
  // METRICS
  //
  // All required checkpoints can now contribute to day
  // progress, not only assessments.
  // ---------------------------------------------------------

  const requiredModules =
    modules.filter(
      (module) =>
        module.is_required
    );

  const completedModules =
    requiredModules.filter(
      (module) =>
        progress.modules[
          module.id
        ] === "completed"
    ).length;

  const totalModules =
    modules.length;

  const requiredCheckpoints =
    checkpoints.filter(
      (checkpoint) =>
        checkpoint.is_required
    );

  const completedCheckpoints =
    requiredCheckpoints.filter(
      (checkpoint) =>
        isCheckpointCompleted(
          checkpointResults.get(
            checkpoint.id
          )
        )
    ).length;

  const totalCheckpoints =
    requiredCheckpoints.length;

  const totalMinutes =
    modules.reduce(
      (total, module) =>
        total +
        (module.duration_minutes ??
          0),
      0
    ) +
    checkpoints.reduce(
      (total, checkpoint) =>
        total +
        (checkpoint.duration_minutes ??
          0),
      0
    );

  const duration =
    formatDuration(
      totalMinutes
    );

  const totalRequiredItems =
    requiredModules.length +
    requiredCheckpoints.length;

  const completedRequiredItems =
    completedModules +
    completedCheckpoints;

  const dayProgress =
    totalRequiredItems > 0
      ? Math.round(
          (completedRequiredItems /
            totalRequiredItems) *
            100
        )
      : dayCompleted
        ? 100
        : 0;

  logPerf(
    "TOTAL LearnerDayPage",
    totalStart
  );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <AppShell
      role="learner"
      userName={profile.full_name}
      userEmail={profile.email}
      learnerJourney={
        learnerJourney
      }
    >
      <div className="mx-auto w-full max-w-[1080px] px-5 py-8 sm:px-7 lg:px-9 lg:py-10">
        <Link
          href="/learn"
          prefetch
          className="inline-flex items-center gap-2 text-[12px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
        >
          <span aria-hidden="true">
            ←
          </span>

          <span>
            Back to overview
          </span>
        </Link>

        {/* DAY HEADER */}

        <section className="mt-5 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_270px]">
            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--teal-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--teal-deep)]">
                  Day{" "}
                  {day.day_number}
                </span>

                {dayCompleted ? (
                  <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--success)]">
                    ✓ Completed
                  </span>
                ) : (
                  <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                    In progress
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-[27px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
                {day.title}
              </h1>

              {day.description && (
                <p className="mt-2 max-w-[680px] whitespace-pre-wrap text-[13px] leading-6 text-[var(--text-secondary)]">
                  {day.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--text-muted)]">
                <span>
                  {totalModules}{" "}
                  {totalModules === 1
                    ? "module"
                    : "modules"}
                </span>

                {duration && (
                  <>
                    <span
                      className="h-1 w-1 rounded-full bg-[var(--border-strong)]"
                      aria-hidden="true"
                    />

                    <span>
                      Approx.{" "}
                      {duration}
                    </span>
                  </>
                )}

                {checkpoints.length >
                  0 && (
                  <>
                    <span
                      className="h-1 w-1 rounded-full bg-[var(--border-strong)]"
                      aria-hidden="true"
                    />

                    <span>
                      {
                        checkpoints.length
                      }{" "}
                      {checkpoints.length ===
                      1
                        ? "checkpoint"
                        : "checkpoints"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* DAY PROGRESS */}

            <div className="border-t border-[var(--border-soft)] bg-[var(--surface-soft)] p-6 lg:border-l lg:border-t-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Day progress
              </p>

              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {dayCompleted
                    ? 100
                    : dayProgress}
                  %
                </span>

                <span className="pb-1 text-[11px] text-[var(--text-muted)]">
                  {
                    completedRequiredItems
                  }
                  /
                  {
                    totalRequiredItems
                  }
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    dayCompleted
                      ? "bg-[var(--success)]"
                      : "bg-[var(--teal)]"
                  }`}
                  style={{
                    width: `${
                      dayCompleted
                        ? 100
                        : Math.min(
                            100,
                            Math.max(
                              0,
                              dayProgress
                            )
                          )
                    }%`,
                  }}
                />
              </div>

              <div className="mt-5 space-y-2.5 border-t border-[var(--border)] pt-4">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-[var(--text-muted)]">
                    Required modules
                  </span>

                  <span className="font-medium text-[var(--text-secondary)]">
                    {
                      completedModules
                    }
                    /
                    {
                      requiredModules.length
                    }
                  </span>
                </div>

                {requiredCheckpoints.length >
                  0 && (
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-[var(--text-muted)]">
                      Required checkpoints
                    </span>

                    <span className="font-medium text-[var(--text-secondary)]">
                      {
                        completedCheckpoints
                      }
                      /
                      {
                        totalCheckpoints
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* LEARNING PATH */}

        <section className="mt-9">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Training content
            </p>

            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Today&apos;s learning path
            </h2>

            <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
              Work through the learning
              path in order and complete
              the required content.
            </p>
          </div>

          {orderedContent.length >
          0 ? (
            <div className="space-y-4">
              {orderedContent.map(
                (content) => {
                  // MODULE

                  if (
                    content.type ===
                    "module"
                  ) {
                    const module =
                      content.module;

                    const moduleNumber =
                      moduleNumbers.get(
                        module.id
                      ) ?? 1;

                    return (
                      <div
                        key={
                          content.id
                        }
                        className="relative"
                      >
                        <div className="mb-2 flex items-center gap-2 px-1">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[9px] font-semibold text-[var(--text-muted)]">
                            {
                              moduleNumber
                            }
                          </span>

                          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                            Module{" "}
                            {
                              moduleNumber
                            }
                          </span>
                        </div>

                        <div className="overflow-hidden rounded-[18px]">
                          <LearnerModuleCard
                            module={
                              module
                            }
                            progress={
                              progress
                            }
                          />

                          <ModuleNotes
                            moduleId={
                              module.id
                            }
                          />
                        </div>
                      </div>
                    );
                  }

                  // CHECKPOINT

                  const checkpoint =
                    content.checkpoint;

                  const result =
                    checkpointResults.get(
                      checkpoint.id
                    );

                  const status =
                    getCheckpointStatus(
                      result
                    );

                  const completed =
                    isCheckpointCompleted(
                      result
                    );

                  const isAssessment =
                    checkpoint.checkpoint_type ===
                    "assessment";

                  const isSession =
                    checkpoint.checkpoint_type ===
                    "trainer_session";

                  const isInformation =
                    checkpoint.checkpoint_type ===
                    "information";

                  const checkpointNumber =
                    checkpointNumbers.get(
                      checkpoint.id
                    );
                 
                  return (
                    <article
                      key={content.id}
                      className={`overflow-hidden rounded-[16px] border bg-white shadow-[var(--shadow-xs)] ${
                        completed
                          ? "border-[var(--success)]/20"
                          : isSession
                            ? "border-[var(--teal)]/30"
                            : "border-[var(--border)]"
                      }`}
                    >
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--teal-deep)]">
                                {getCheckpointEyebrow(
                                  checkpoint.checkpoint_type
                                )}

                                {isAssessment &&
                                checkpointNumber
                                  ? ` ${checkpointNumber}`
                                  : ""}
                              </span>

                              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[9px] font-semibold text-[var(--text-secondary)]">
                                {getCheckpointTypeLabel(
                                  checkpoint.checkpoint_type
                                )}
                              </span>

                              {(isAssessment ||
                                checkpoint.allow_learner_completion) && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${status.className}`}
                                >
                                  {
                                    status.label
                                  }
                                </span>
                              )}

                              {checkpoint.is_required && (
                                <span className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[9px] font-semibold text-[var(--warning)]">
                                  Required
                                </span>
                              )}
                            </div>

                            <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                              {
                                checkpoint.title
                              }
                            </h3>

                            {checkpoint.description && (
                              <p className="mt-1 max-w-[650px] whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)]">
                                {
                                  checkpoint.description
                                }
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[var(--text-muted)]">
                              {isAssessment &&
                                checkpoint.passing_score !==
                                  null && (
                                  <span>
                                    Passing score:{" "}
                                    {
                                      checkpoint.passing_score
                                    }
                                    %
                                  </span>
                                )}

                              {isAssessment &&
                                result?.score !==
                                  null &&
                                result?.score !==
                                  undefined && (
                                  <span>
                                    Score:{" "}
                                    {Number(
                                      result.score
                                    ).toFixed(
                                      0
                                    )}
                                    %
                                  </span>
                                )}

                              {isSession &&
  checkpoint.scheduled_at && (
    <DualDateTime
      value={checkpoint.scheduled_at}
      compact
    />
  )}

                              {isSession &&
                                checkpoint.duration_minutes && (
                                  <span>
                                    {formatDuration(
                                      checkpoint.duration_minutes
                                    )}
                                  </span>
                                )}
                            </div>

                            {isAssessment &&
                              result?.trainer_feedback && (
                                <div className="mt-4 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                                  <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                    Trainer feedback
                                  </p>

                                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-[var(--text-secondary)]">
                                    {
                                      result.trainer_feedback
                                    }
                                  </p>
                                </div>
                              )}

                            {isInformation &&
                              !checkpoint.allow_learner_completion && (
                                <p className="mt-3 text-[10px] font-medium text-[var(--text-muted)]">
                                  Continue with the
                                  next item when you
                                  are ready.
                                </p>
                              )}
                          </div>

                          {/* ACTIONS */}

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {isAssessment &&
                              checkpoint.quiz_id && (
                                <Link
                                  href={`/learn/quiz/${checkpoint.quiz_id}`}
                                  prefetch
                                  className="inline-flex min-w-[138px] items-center justify-center rounded-[9px] bg-[var(--teal)] px-4 py-2.5 text-[12px] font-semibold !text-white transition hover:bg-[var(--teal-deep)] hover:!text-white"
                                >
                                  {result
                                    ? "View checkpoint"
                                    : "Start checkpoint"}
                                </Link>
                              )}

                            {isAssessment &&
                              !checkpoint.quiz_id && (
                                <span className="inline-flex min-w-[138px] items-center justify-center rounded-[9px] bg-[var(--surface-muted)] px-4 py-2.5 text-[11px] font-medium text-[var(--text-muted)]">
                                  Not available
                                </span>
                              )}

                            {isSession &&
                              checkpoint.meeting_url && (
                                <a
                                  href={
                                    checkpoint.meeting_url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-w-[138px] items-center justify-center rounded-[9px] bg-[var(--teal)] px-4 py-2.5 text-[12px] font-semibold !text-white transition hover:bg-[var(--teal-deep)] hover:!text-white"
                                >
                                  Join session
                                </a>
                              )}

                            {isSession &&
                              !checkpoint.meeting_url && (
                                <span className="inline-flex min-w-[138px] items-center justify-center rounded-[9px] bg-[var(--surface-muted)] px-4 py-2.5 text-[11px] font-medium text-[var(--text-muted)]">
                                  Session details
                                  pending
                                </span>
                              )}

                            {checkpoint.allow_learner_completion && (
                              <CheckpointCompletionButton
                                checkpointId={
                                  checkpoint.id
                                }
                                completed={
                                  completed
                                }
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-[var(--border-strong)] bg-white p-10 text-center">
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                No training content
                available yet
              </h3>

              <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                Training content for
                this day has not been
                added yet.
              </p>
            </div>
          )}
        </section>

        {/* END OF DAY */}

        <section
          className={`mt-8 rounded-[14px] border px-5 py-4 ${
            dayCompleted
              ? "border-[var(--success)]/20 bg-[var(--success-soft)]"
              : "border-[var(--border)] bg-[var(--surface-soft)]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  dayCompleted
                    ? "bg-[var(--success)] text-white"
                    : "bg-white text-[var(--text-muted)]"
                }`}
              >
                {dayCompleted
                  ? "✓"
                  : day.day_number}
              </div>

              <div>
                <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                  {dayCompleted
                    ? `Day ${day.day_number} complete`
                    : `Complete Day ${day.day_number}`}
                </p>

                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  {dayCompleted
                    ? "Your progress has been saved and your next available step will appear in the onboarding journey."
                    : "Finish the required learning content and checkpoints to complete this day."}
                </p>
              </div>
            </div>

            <Link
              href="/learn"
              prefetch
              className="text-[11px] font-semibold text-[var(--teal-deep)] transition hover:text-[var(--teal)]"
            >
              View journey →
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}