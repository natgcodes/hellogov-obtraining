import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import LearnerModuleCard from "@/components/learning/LearnerModuleCard";
import ModuleNotes from "@/components/learning/ModuleNotes";
import DualDateTime from "@/components/ui/DualDateTime";

import { createClient } from "@/lib/supabase/server";
import { getImpersonatedLearnerJourney } from "@/lib/trainer/getImpersonatedLearner";

import type {
  LearnerModule,
  ProgressMap,
} from "@/lib/learning/types";

// ============================================================
// TYPES
// ============================================================

type PageProps = {
  params: Promise<{
    learnerId: string;
    dayId: string;
  }>;
};

type DayProgressRpc = {
  modules?: Array<{
    module_id: string;
    status: string | null;
  }>;

  materials?: Array<{
    material_id: string;
    completed: boolean | null;
  }>;

  activities?: Array<{
    activity_id: string;
    status: string | null;
  }>;

  checkpoints?: Array<{
    checkpoint_id: string;
    status: string | null;
    score: number | null;
    passed: boolean | null;
    trainer_feedback: string | null;
    submitted_at: string | null;
    graded_at: string | null;
  }>;
};

type CheckpointProgress = {
  status: string;
  score: number | null;
  passed: boolean | null;
  trainer_feedback: string | null;
  submitted_at: string | null;
  graded_at: string | null;
};

type CheckpointProgressMap = Record<
  string,
  CheckpointProgress
>;

type Checkpoint = {
  id: string;
  title: string;
  description: string | null;
  checkpoint_type: string;
  passing_score: number | null;
  is_required: boolean;
  position: number;
  quiz_id: string | null;
  meeting_url: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
};

type DayContentItem = {
  id: string;
  content_type: string;
  content_id: string;
  position: number;
};

type OrderedContent =
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
      checkpoint: Checkpoint;
    };

// ============================================================
// PAGE
// ============================================================

export default async function ImpersonatedDayPage({
  params,
}: PageProps) {
  const { learnerId, dayId } = await params;

  const supabase = await createClient();

  // ============================================================
  // AUTH
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ============================================================
  // TRAINER SECURITY
  // ============================================================

  const {
    data: trainerProfile,
    error: trainerProfileError,
  } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (
    trainerProfileError ||
    !trainerProfile ||
    trainerProfile.role !== "trainer"
  ) {
    redirect("/learn");
  }

  // ============================================================
  // TARGET TRAINEE
  // ============================================================

  const {
    data: trainee,
    error: traineeError,
  } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", learnerId)
    .single();

  if (
    traineeError ||
    !trainee ||
    trainee.role === "trainer"
  ) {
    notFound();
  }

  const traineeName =
    trainee.full_name?.trim() ||
    trainee.email ||
    "Trainee";

  // ============================================================
  // TARGET TRAINEE JOURNEY
  // ============================================================

  const journey =
    await getImpersonatedLearnerJourney(
      learnerId
    );

  if (!journey) {
    redirect(
      `/trainer/impersonate/${learnerId}`
    );
  }

  const journeyDay =
    journey.days.find(
      (item) => item.id === dayId
    );

  if (!journeyDay) {
    notFound();
  }

  if (!journeyDay.unlocked) {
    redirect(
      `/trainer/impersonate/${learnerId}`
    );
  }

  // ============================================================
  // DAY CONTENT
  //
  // day_content is the source of truth for ordering.
  // ============================================================

  const {
    data: day,
    error: dayError,
  } = await supabase
    .from("days")
    .select(`
      id,
      day_number,
      title,
      description,
      position,

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
        is_required,
        position,

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
          resource_url,
          position
        ),

        quizzes (
          id,
          title,
          description,
          instructions,
          passing_score,
          max_attempts,
          is_required,
          is_published,
          show_results,
          position
        )
      ),

            checkpoints (
        id,
        title,
        description,
        checkpoint_type,
        passing_score,
        is_required,
        position,
        quiz_id,
        meeting_url,
        scheduled_at,
        duration_minutes
      )
    `)
    .eq("id", dayId)
    .eq("is_published", true)
    .single();

  if (dayError) {
    throw new Error(
      [
        "IMPERSONATION DAY QUERY FAILED",
        `message: ${dayError.message ?? "none"}`,
        `details: ${dayError.details ?? "none"}`,
        `hint: ${dayError.hint ?? "none"}`,
        `code: ${dayError.code ?? "none"}`,
      ].join(" | ")
    );
  }

  if (!day) {
    notFound();
  }

  // ============================================================
  // TARGET TRAINEE DAY PROGRESS
  // ============================================================

  const {
    data: progressData,
    error: progressError,
  } = await supabase.rpc(
    "get_trainer_impersonated_day_progress",
    {
      target_day_id: dayId,
      target_learner_id: learnerId,
    }
  );

  if (progressError) {
    console.error(
      "Unable to load impersonated day progress:",
      progressError
    );
  }

  const rawProgress =
    (progressData ?? {}) as DayProgressRpc;

  // ============================================================
  // LEARNER PROGRESS MAP
  // ============================================================

  const progress: ProgressMap = {
    setup: {},
    modules: {},
    materials: {},
    activities: {},
    quizzes: {},
    percent: 0,
  };

  for (const item of rawProgress.modules ?? []) {
    progress.modules[item.module_id] =
      item.status ?? "not_started";
  }

  for (const item of rawProgress.materials ?? []) {
    progress.materials[item.material_id] =
      item.completed ?? false;
  }

  for (const item of rawProgress.activities ?? []) {
    progress.activities[item.activity_id] =
      item.status ?? "not_started";
  }

  // ============================================================
  // CHECKPOINT PROGRESS
  // ============================================================

  const checkpointProgress:
    CheckpointProgressMap = {};

  for (const item of rawProgress.checkpoints ?? []) {
    checkpointProgress[item.checkpoint_id] = {
      status: item.status ?? "not_started",
      score: item.score,
      passed: item.passed,
      trainer_feedback: item.trainer_feedback,
      submitted_at: item.submitted_at,
      graded_at: item.graded_at,
    };
  }

  // ============================================================
  // NORMALIZE MODULES
  // ============================================================

  const rawModules = [
    ...(day.modules ?? []),
  ].sort(
    (a, b) =>
      (a.position ?? 0) -
      (b.position ?? 0)
  );

  const modules: LearnerModule[] =
    rawModules.map((module) => {
      const materials = [
        ...(module.materials ?? []),
      ]
        .sort(
          (a, b) =>
            (a.position ?? 0) -
            (b.position ?? 0)
        )
        .map((material) => ({
          id: material.id,
          title: material.title,
          description: material.description,
          material_type: material.material_type,
          url: material.url,
          is_required: material.is_required,
          position: material.position ?? 0,
        }));

      const activities = [
        ...(module.activities ?? []),
      ]
        .sort(
          (a, b) =>
            (a.position ?? 0) -
            (b.position ?? 0)
        )
        .map((activity) => ({
          id: activity.id,
          title: activity.title,
          description: activity.description,
          instructions: activity.instructions,
          activity_type: activity.activity_type,
          duration_minutes:
            activity.duration_minutes,
          is_required: activity.is_required,
          resource_url: activity.resource_url,
          position: activity.position ?? 0,
        }));

      const quizzes = [
        ...(module.quizzes ?? []),
      ]
        .filter(
          (quiz) =>
            quiz.is_published !== false
        )
        .sort(
          (a, b) =>
            (a.position ?? 0) -
            (b.position ?? 0)
        )
        .map((quiz) => ({
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          instructions: quiz.instructions,
          passing_score: quiz.passing_score,
          max_attempts: quiz.max_attempts,
          is_required: quiz.is_required,
          is_published: quiz.is_published,
          show_results: quiz.show_results,
          position: quiz.position ?? 0,
        }));

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        objective: module.objective,
        duration_minutes: module.duration_minutes,
        is_required: module.is_required,
        position: module.position ?? 0,
        materials,
        activities,
        quizzes,
      };
    });

  // ============================================================
  // NORMALIZE CHECKPOINTS
  // ============================================================

    const checkpoints: Checkpoint[] = [
    ...(day.checkpoints ?? []),
  ].map((checkpoint) => ({
    id: checkpoint.id,
    title: checkpoint.title,
    description: checkpoint.description,
    checkpoint_type: checkpoint.checkpoint_type,
    passing_score: checkpoint.passing_score,
    is_required: checkpoint.is_required,
    position: checkpoint.position ?? 0,
    quiz_id: checkpoint.quiz_id,
    meeting_url: checkpoint.meeting_url,
    scheduled_at: checkpoint.scheduled_at,
    duration_minutes: checkpoint.duration_minutes,
  }));

  // ============================================================
  // BUILD ORDERED CONTENT
  //
  // Modules and checkpoints are interleaved according to
  // day_content.position.
  // ============================================================

  const moduleMap = new Map(
    modules.map((module) => [
      module.id,
      module,
    ])
  );

  const checkpointMap = new Map(
    checkpoints.map((checkpoint) => [
      checkpoint.id,
      checkpoint,
    ])
  );

  const orderedContent: OrderedContent[] = [];

  const dayContent = [
    ...((day.day_content ?? []) as DayContentItem[]),
  ].sort(
    (a, b) => a.position - b.position
  );

  for (const item of dayContent) {
    if (item.content_type === "module") {
      const module = moduleMap.get(
        item.content_id
      );

      if (module) {
        orderedContent.push({
          type: "module",
          id: module.id,
          position: item.position,
          module,
        });
      }
    }

    if (item.content_type === "checkpoint") {
      const checkpoint = checkpointMap.get(
        item.content_id
      );

      if (checkpoint) {
        orderedContent.push({
          type: "checkpoint",
          id: checkpoint.id,
          position: item.position,
          checkpoint,
        });
      }
    }
  }

  // ============================================================
  // DAY SUMMARY
  // ============================================================

  const completedModules =
    modules.filter(
      (module) =>
        progress.modules[module.id] === "completed"
    ).length;

  const isCheckpointComplete = (
    checkpoint: Checkpoint
  ) => {
    const result =
      checkpointProgress[checkpoint.id];

    if (!result) {
      return false;
    }

    if (
      checkpoint.checkpoint_type ===
      "assessment"
    ) {
      return (
        result.status === "completed" &&
        result.passed === true
      );
    }

    return result.status === "completed";
  };

  const completedCheckpoints =
    checkpoints.filter(isCheckpointComplete).length;

  const requiredModules =
    modules.filter(
      (module) => module.is_required
    );

  const requiredCheckpoints =
    checkpoints.filter(
      (checkpoint) => checkpoint.is_required
    );

  const requiredItems =
    requiredModules.length +
    requiredCheckpoints.length;

  const completedRequiredModules =
    requiredModules.filter(
      (module) =>
        progress.modules[module.id] === "completed"
    ).length;

  const completedRequiredCheckpoints =
    requiredCheckpoints.filter(
      isCheckpointComplete
    ).length;

  const completedRequiredItems =
    completedRequiredModules +
    completedRequiredCheckpoints;

  const dayPercent =
    requiredItems > 0
      ? Math.round(
          (completedRequiredItems /
            requiredItems) *
            100
        )
      : 100;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <AppShell
      role="trainer"
      userName={trainerProfile.full_name}
      userEmail={trainerProfile.email}
      learnerJourney={journey}
      impersonation={{
        learnerId,
        learnerName: traineeName,
        learnerEmail: trainee.email,
      }}
    >
      {/* =======================================================
          IMPERSONATION BANNER
      ======================================================= */}

      <div className="border-b border-[#08A9C1]/20 bg-[#EAF8FA]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#08A9C1] text-white">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-[#07879B]">
                Impersonating {traineeName}
              </p>

              <p className="text-[11px] text-[var(--text-secondary)]">
                Read-only trainee preview
              </p>
            </div>
          </div>

          <Link
            href={`/trainer/learners/${learnerId}`}
            className="inline-flex min-h-9 items-center justify-center rounded-[9px] border border-[#08A9C1]/30 bg-white px-3.5 text-[12px] font-semibold !text-[#07879B] transition hover:bg-[#F5FCFD]"
          >
            Exit impersonation
          </Link>
        </div>
      </div>

      {/* =======================================================
          PAGE CONTENT
      ======================================================= */}

      <div className="px-5 py-7 sm:px-7 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <Link
            href={`/trainer/impersonate/${learnerId}`}
            className="inline-flex items-center gap-2 text-[12px] font-semibold !text-[var(--text-secondary)] transition hover:!text-[var(--teal-deep)]"
          >
            ← Back to training
          </Link>

          {/* ===================================================
              DAY HEADER
          =================================================== */}

          <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white px-6 py-6 shadow-[var(--shadow-sm)] sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal-deep)]">
                  Day {day.day_number}
                </p>

                <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                  {day.title}
                </h1>

                {day.description && (
                  <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[var(--text-secondary)]">
                    {day.description}
                  </p>
                )}
              </div>
            </div>

            {/* =================================================
                DAY PROGRESS
            ================================================= */}

            <div className="mt-6 border-t border-[var(--border-soft)] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                    Day progress
                  </p>

                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {completedRequiredItems}/{requiredItems} required items completed
                  </p>
                </div>

                <p className="text-[13px] font-semibold text-[var(--teal-deep)]">
                  {dayPercent}%
                </p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--teal)]"
                  style={{
                    width: `${dayPercent}%`,
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-[var(--text-secondary)]">
                <span>
                  Modules: {completedModules}/{modules.length}
                </span>

                <span>
                  Checkpoints: {completedCheckpoints}/{checkpoints.length}
                </span>
              </div>
            </div>
          </div>

          {/* ===================================================
              ORDERED DAY CONTENT
          =================================================== */}

          <div className="mt-6 space-y-6">
            {orderedContent.map((content) => {
              // ===============================================
              // MODULE
              // ===============================================

              if (content.type === "module") {
                return (
                  <div key={`module-${content.id}`}>
                    <LearnerModuleCard
                      module={content.module}
                      progress={progress}
                      readOnly
                    />

                    <ModuleNotes
                      moduleId={content.module.id}
                      learnerId={learnerId}
                      readOnly
                    />
                  </div>
                );
              }

              // ===============================================
              // CHECKPOINT
              // ===============================================

              const checkpoint =
                content.checkpoint;

              const result =
                checkpointProgress[
                  checkpoint.id
                ];

              const completed =
                isCheckpointComplete(checkpoint);

              const isAssessment =
                checkpoint.checkpoint_type ===
                "assessment";

              return (
                <div
                  key={`checkpoint-${content.id}`}
                  className="rounded-[14px] border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--teal-deep)]">
                          {checkpoint.checkpoint_type.replace(
                            /_/g,
                            " "
                          )}
                        </span>

                        {checkpoint.is_required && (
                          <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                            · Required
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 text-[13px] font-semibold text-[var(--text-primary)]">
                        {checkpoint.title}
                      </h3>

                      {checkpoint.description && (
                        <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                          {checkpoint.description}
                        </p>
                      )}

                      {checkpoint.checkpoint_type ===
                        "trainer_session" && (
                        <div className="mt-3 space-y-2">
                          {checkpoint.scheduled_at ? (
                            <DualDateTime
                              value={checkpoint.scheduled_at}
                              compact
                            />
                          ) : (
                            <p className="text-[11px] text-[var(--text-muted)]">
                              Session date and time pending
                            </p>
                          )}

                          {checkpoint.duration_minutes != null && (
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              Duration: {checkpoint.duration_minutes} min
                            </p>
                          )}

                          {checkpoint.meeting_url && (
                            <a
                              href={checkpoint.meeting_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex text-[12px] font-semibold text-[var(--teal-deep)] hover:underline"
                            >
                              View meeting link ↗
                            </a>
                          )}
                        </div>
                      )}



                      {result?.score !== null &&
                        result?.score !== undefined && (
                          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                            Score: {result.score}%
                          </p>
                        )}

                      {result?.trainer_feedback && (
                        <div className="mt-3 rounded-[10px] bg-[var(--surface-soft)] px-3.5 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                            Trainer feedback
                          </p>

                          <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                            {result.trainer_feedback}
                          </p>
                        </div>
                      )}

                      {isAssessment &&
                        checkpoint.quiz_id && (
                          <div className="mt-3">
                            <Link
                              href={`/trainer/impersonate/${learnerId}/quiz/${checkpoint.quiz_id}`}
                              className="inline-flex min-h-9 items-center rounded-[9px] border border-[var(--border)] bg-white px-3.5 text-[12px] font-semibold !text-[var(--teal-deep)] transition hover:bg-[var(--surface-soft)]"
                            >
                              View assessment
                            </Link>
                          </div>
                        )}
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                        completed
                          ? "bg-[var(--success-soft)] text-[var(--success)]"
                          : result
                            ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                            : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                      }`}
                    >
                      {completed
                        ? isAssessment
                          ? "Passed"
                          : "Completed"
                        : result?.status ??
                          "Not started"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}