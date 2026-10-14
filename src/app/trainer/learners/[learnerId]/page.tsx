import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import LearnerManagementPanel from "@/components/trainer/LearnerManagementPanel";
import LearnerProgressBreakdown, {
  type DayProgress,
  type ModuleProgress,
  type TrainingItem,
  type CheckpointProgress,
} from "@/components/trainer/LearnerProgressBreakdown";
import ResetTraineeProgress from "@/components/trainer/ResetTraineeProgress";
import { createClient } from "@/lib/supabase/server";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";

type Props = {
  params: Promise<{
    learnerId: string;
  }>;
};

type LearnerSummaryRow = {
  learner_id: string;
  full_name: string | null;
  email: string | null;
  enrollment_status: string;
  progress_percent: number | string | null;
  completed_modules: number | string | null;
  total_modules: number | string | null;
  passed_quizzes: number | string | null;
  total_quizzes: number | string | null;
  needs_review: number | string | null;
  completed_checkpoints: number | string | null;
  total_checkpoints: number | string | null;
};

type DayRow = {
  day_id: string;
  day_number: number;
  day_title: string;
  day_position: number;
  day_status: string;
};

type ModuleRow = {
  day_id: string;
  module_id: string;
  module_title: string;
  module_position: number;
  is_required: boolean;
  module_status: string;
};

type QuizRow = {
  module_id: string;
  quiz_id: string;
  quiz_title: string;
  quiz_position: number;
  is_required: boolean;
  latest_attempt_id: string | null;
  latest_attempt_status: string | null;
  latest_attempt_score: number | string | null;
  latest_submitted_at: string | null;
  passed: boolean;
};

type CheckpointRow = {
  checkpoint_id: string;
  day_id: string;
  checkpoint_title: string;
  checkpoint_position: number;
  checkpoint_type: string;
  is_required: boolean;
  checkpoint_status: string;
  quiz_attempt_id: string | null;
  quiz_attempt_status: string | null;
  score: number | string | null;
};

type MaterialRow = {
  id: string;
  module_id: string;
  title: string;
  position: number;
  is_required: boolean;
};

type ActivityDefinitionRow = {
  id: string;
  module_id: string;
  title: string;
  position: number;
  is_required: boolean;
};

type MaterialProgressRow = {
  material_id: string;
  completed: boolean;
};

type ActivityProgressRow = {
  activity_id: string;
  status: string;
};

type ActivityRow = {
  event_type: string | null;
  event_id: string;
  title: string;
  status: string | null;
  occurred_at: string | null;
  score: number | string | null;
};

export default async function LearnerDetailPage({
  params,
}: Props) {
  const { learnerId } = await params;

  const supabase = await createClient();

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

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

  if (!profile || profile.role !== "trainer") {
    redirect("/learn");
  }

  // ----------------------------------------------------------
  // PROGRAM
  // ----------------------------------------------------------

  const program = await getTrainerProgram();

  if (!program) {
    notFound();
  }

  const rpcParams = {
    target_program_id: program.id,
    target_learner_id: learnerId,
  };

  // ----------------------------------------------------------
  // TRAINER / TRAINEE DATA
  // ----------------------------------------------------------

  const [
    summaryResponse,
    daysResponse,
    modulesResponse,
    quizzesResponse,
    checkpointsResponse,
    activityResponse,
    learnerProfileResponse,
  ] = await Promise.all([
    supabase.rpc(
      "get_trainer_learner_summary",
      rpcParams
    ),

    supabase.rpc(
      "get_trainer_learner_day_progress",
      rpcParams
    ),

    supabase.rpc(
      "get_trainer_learner_module_progress",
      rpcParams
    ),

    supabase.rpc(
      "get_trainer_learner_quiz_progress",
      rpcParams
    ),

    supabase.rpc(
      "get_trainer_learner_checkpoint_progress",
      rpcParams
    ),

    supabase.rpc(
      "get_trainer_learner_activity",
      rpcParams
    ),

    supabase
      .from("profiles")
      .select("full_name, email, team_lead")
      .eq("id", learnerId)
      .single(),
  ]);

  // ----------------------------------------------------------
  // ERRORS
  // ----------------------------------------------------------

  if (summaryResponse.error) {
    console.error(
      "Unable to load trainee summary:",
      summaryResponse.error
    );

    notFound();
  }

  if (daysResponse.error) {
    console.error(
      "Unable to load trainee day progress:",
      daysResponse.error
    );

    throw new Error(
      "Unable to load trainee day progress."
    );
  }

  if (modulesResponse.error) {
    console.error(
      "Unable to load trainee module progress:",
      modulesResponse.error
    );

    throw new Error(
      "Unable to load trainee module progress."
    );
  }

  if (quizzesResponse.error) {
    console.error(
      "Unable to load trainee quiz progress:",
      quizzesResponse.error
    );

    throw new Error(
      "Unable to load trainee quiz progress."
    );
  }

  if (checkpointsResponse.error) {
    console.error(
      "Unable to load trainee checkpoint progress:",
      checkpointsResponse.error
    );

    throw new Error(
      "Unable to load trainee checkpoint progress."
    );
  }

  if (activityResponse.error) {
    console.error(
      "Unable to load trainee activity:",
      activityResponse.error
    );
  }

  if (learnerProfileResponse.error) {
    console.error(
      "Unable to load trainee profile:",
      learnerProfileResponse.error
    );
  }

  // ----------------------------------------------------------
  // NORMALIZE DATA
  // ----------------------------------------------------------

  const summaryRaw = summaryResponse.data;

  const summary = (
    Array.isArray(summaryRaw)
      ? summaryRaw[0]
      : summaryRaw
  ) as LearnerSummaryRow | null;

  if (!summary) {
    notFound();
  }

  const learnerProfile =
    learnerProfileResponse.data;

  const dayRows = (daysResponse.data ??
    []) as DayRow[];

  const moduleRows = (modulesResponse.data ??
    []) as ModuleRow[];

  const quizRows = (quizzesResponse.data ??
    []) as QuizRow[];

  const checkpointRows = (checkpointsResponse.data ??
    []) as CheckpointRow[];

  const activity = (activityResponse.data ??
    []) as ActivityRow[];

  // ----------------------------------------------------------
  // FETCH MATERIALS AND ACTIVITIES
  // ----------------------------------------------------------

  const moduleIds = moduleRows.map(
    (module) => module.module_id
  );

  let materials: MaterialRow[] = [];
  let activities: ActivityDefinitionRow[] = [];

  if (moduleIds.length > 0) {
    const [
      materialsResponse,
      activitiesResponse,
    ] = await Promise.all([
      supabase
        .from("materials")
        .select(
          "id, module_id, title, position, is_required"
        )
        .in("module_id", moduleIds)
        .order("position"),

      supabase
        .from("activities")
        .select(
          "id, module_id, title, position, is_required"
        )
        .in("module_id", moduleIds)
        .order("position"),
    ]);

    if (materialsResponse.error) {
      console.error(
        "Unable to load materials:",
        materialsResponse.error
      );

      throw new Error(
        "Unable to load training materials."
      );
    }

    if (activitiesResponse.error) {
      console.error(
        "Unable to load activities:",
        activitiesResponse.error
      );

      throw new Error(
        "Unable to load training activities."
      );
    }

    materials =
      (materialsResponse.data ?? []) as MaterialRow[];

    activities =
      (activitiesResponse.data ??
        []) as ActivityDefinitionRow[];
  }

  // ----------------------------------------------------------
  // FETCH LEARNER ITEM PROGRESS
  // ----------------------------------------------------------

  const materialIds = materials.map(
    (material) => material.id
  );

  const activityIds = activities.map(
    (item) => item.id
  );

  let materialProgress: MaterialProgressRow[] = [];
  let activityProgress: ActivityProgressRow[] = [];

  const [
    materialProgressResponse,
    activityProgressResponse,
  ] = await Promise.all([
    materialIds.length > 0
      ? supabase
          .from("learner_material_progress")
          .select("material_id, completed")
          .eq("learner_id", learnerId)
          .in("material_id", materialIds)
      : Promise.resolve({
          data: [] as MaterialProgressRow[],
          error: null,
        }),

    activityIds.length > 0
      ? supabase
          .from("learner_activity_progress")
          .select("activity_id, status")
          .eq("learner_id", learnerId)
          .in("activity_id", activityIds)
      : Promise.resolve({
          data: [] as ActivityProgressRow[],
          error: null,
        }),
  ]);

  if (materialProgressResponse.error) {
    console.error(
      "Unable to load material progress:",
      materialProgressResponse.error
    );

    throw new Error(
      "Unable to load trainee material progress."
    );
  }

  if (activityProgressResponse.error) {
    console.error(
      "Unable to load activity progress:",
      activityProgressResponse.error
    );

    throw new Error(
      "Unable to load trainee activity progress."
    );
  }

  materialProgress =
    (materialProgressResponse.data ??
      []) as MaterialProgressRow[];

  activityProgress =
    (activityProgressResponse.data ??
      []) as ActivityProgressRow[];

  // ----------------------------------------------------------
  // PROGRESS LOOKUPS
  // ----------------------------------------------------------

  const materialProgressMap = new Map(
    materialProgress.map((item) => [
      item.material_id,
      item.completed,
    ])
  );

  const activityProgressMap = new Map(
    activityProgress.map((item) => [
      item.activity_id,
      item.status,
    ])
  );

  // ----------------------------------------------------------
  // BUILD BREAKDOWN DATA
  // ----------------------------------------------------------

  const days: DayProgress[] = dayRows.map(
    (day) => ({
      day_id: day.day_id,
      day_number: day.day_number,
      day_title: day.day_title,
      day_position: day.day_position,
      day_status: day.day_status,
    })
  );

  const modules: ModuleProgress[] =
    moduleRows.map((module) => ({
      day_id: module.day_id,
      module_id: module.module_id,
      module_title: module.module_title,
      module_position: module.module_position,
      is_required: module.is_required,
      module_status: module.module_status,
    }));

  const items: TrainingItem[] = [
    ...materials.map((material) => {
      const completed =
        materialProgressMap.get(material.id) ??
        false;

      return {
        id: material.id,
        module_id: material.module_id,
        title: material.title,
        type: "material" as const,
        position: material.position,
        is_required: material.is_required,
        status: completed
          ? "completed"
          : "not_started",
        completed,
      };
    }),

    ...activities.map((activityItem) => {
      const status =
        activityProgressMap.get(
          activityItem.id
        ) ?? "not_started";

      return {
        id: activityItem.id,
        module_id: activityItem.module_id,
        title: activityItem.title,
        type: "activity" as const,
        position: activityItem.position,
        is_required: activityItem.is_required,
        status,
        completed: status === "completed",
      };
    }),

    ...quizRows.map((quiz) => {
      const submitted =
        quiz.latest_submitted_at !== null &&
        quiz.latest_submitted_at !== undefined;

      const status =
        quiz.latest_attempt_status === "graded"
          ? quiz.passed
            ? "passed"
            : "failed"
          : quiz.latest_attempt_status ??
            "not_started";

      return {
        id: quiz.quiz_id,
        module_id: quiz.module_id,
        title: quiz.quiz_title,
        type: "quiz" as const,
        position: quiz.quiz_position,
        is_required: quiz.is_required,
        status,
        completed: submitted,
        attempt_id: quiz.latest_attempt_id,
        score:
          quiz.latest_attempt_score === null
            ? null
            : Number(quiz.latest_attempt_score),
      };
    }),
  ];

  const checkpoints: CheckpointProgress[] =
    checkpointRows.map((checkpoint) => ({
      checkpoint_id: checkpoint.checkpoint_id,
      day_id: checkpoint.day_id,
      checkpoint_title:
        checkpoint.checkpoint_title,
      checkpoint_position:
        checkpoint.checkpoint_position,
      checkpoint_type:
        checkpoint.checkpoint_type,
      is_required: checkpoint.is_required,
      checkpoint_status:
        checkpoint.checkpoint_status,
      quiz_attempt_id:
        checkpoint.quiz_attempt_id,
      quiz_attempt_status:
        checkpoint.quiz_attempt_status,
      score:
        checkpoint.score === null
          ? null
          : Number(checkpoint.score),
    }));

  // ----------------------------------------------------------
  // METRICS
  // ----------------------------------------------------------

  const progress = Math.max(
    0,
    Math.min(
      100,
      Number(summary.progress_percent ?? 0)
    )
  );

  const completedModules = Number(
    summary.completed_modules ?? 0
  );

  const totalModules = Number(
    summary.total_modules ?? 0
  );

  const passedQuizzes = Number(
    summary.passed_quizzes ?? 0
  );

  const totalQuizzes = Number(
    summary.total_quizzes ?? 0
  );

  const completedCheckpoints = Number(
    summary.completed_checkpoints ?? 0
  );

  const totalCheckpoints = Number(
    summary.total_checkpoints ?? 0
  );

  const needsReview = Number(
    summary.needs_review ?? 0
  );

  const traineeName =
    learnerProfile?.full_name ??
    summary.full_name ??
    "Trainee";

  const traineeEmail =
    learnerProfile?.email ??
    summary.email ??
    "No email available";

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">
          {/* BACK */}

          <Link
            href="/trainer/learners"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium !text-[var(--text-muted)] transition hover:!text-[var(--text-primary)]"
          >
            <span aria-hidden="true">←</span>
            Back to trainees
          </Link>

          {/* PROFILE HEADER */}

          <section className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF8FA] text-[14px] font-semibold text-[#07879B]">
                {getInitials(
                  traineeName,
                  traineeEmail
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
                  Trainee Profile
                </p>

                <h1 className="mt-1 truncate text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
                  {traineeName}
                </h1>

                <p className="mt-1 truncate text-[13px] text-[var(--text-secondary)]">
                  {traineeEmail}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/trainer/impersonate/${learnerId}`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#08A9C1]/25 bg-[#EAF8FA] px-4 text-[11px] font-semibold !text-[#07879B] transition hover:bg-[#DDF4F7]"
              >
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

                Impersonate
              </Link>

              <StatusBadge
                status={
                  summary.enrollment_status
                }
              />
            </div>
          </section>

          {/* MANAGEMENT */}

          <div className="mt-7">
            <LearnerManagementPanel
              learnerId={learnerId}
              programId={program.id}
              fullName={traineeName}
              email={
                learnerProfile?.email ??
                summary.email
              }
              teamLead={
                learnerProfile?.team_lead ??
                null
              }
              enrollmentStatus={
                summary.enrollment_status
              }
            />
          </div>

          {/* OVERALL PROGRESS */}

          <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Overall onboarding progress
                </p>

                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-[32px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                    {Math.round(progress)}%
                  </p>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    completed
                  </p>
                </div>
              </div>

              {needsReview > 0 && (
                <Link
                  href="/trainer/review"
                  className="inline-flex min-h-9 items-center justify-center rounded-[9px] bg-amber-50 px-3.5 text-[11px] font-semibold !text-amber-700 transition hover:bg-amber-100"
                >
                  {needsReview}{" "}
                  {needsReview === 1
                    ? "review"
                    : "reviews"}{" "}
                  pending
                </Link>
              )}
            </div>

            <div className="border-t border-[var(--border-soft)] px-5 py-4 sm:px-6">
              <div className="h-2 overflow-hidden rounded-full bg-[#EEF2F4]">
                <div
                  className="h-full rounded-full bg-[#08A9C1] transition-[width]"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* METRICS */}

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Modules"
              value={`${completedModules}/${totalModules}`}
              helper="Completed"
            />

            <Metric
              label="Quizzes passed"
              value={`${passedQuizzes}/${totalQuizzes}`}
              helper="Passed assessments"
            />

            <Metric
              label="Checkpoints"
              value={`${completedCheckpoints}/${totalCheckpoints}`}
              helper="Completed"
            />

            <Metric
              label="Needs review"
              value={needsReview}
              helper="Awaiting trainer action"
            />
          </section>

          {/* DETAILED PROGRESS */}

          <LearnerProgressBreakdown
            days={days}
            modules={modules}
            items={items}
            checkpoints={checkpoints}
          />

          {/* RECENT ACTIVITY */}

          <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
            <SectionHeader
              title="Recent Activity"
              description="Latest onboarding activity for this trainee."
              count={activity.length}
            />

            {activity.length === 0 ? (
              <EmptyState>
                No trainee activity yet.
              </EmptyState>
            ) : (
              <div className="divide-y divide-[var(--border-soft)]">
                {activity.map((item, index) => (
                  <div
                    key={`${item.event_type ?? "activity"}-${item.event_id}-${index}`}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#FAFCFC] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {item.title}
                      </p>

                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {formatLabel(
                          item.event_type
                        )}
                        {item.occurred_at
                          ? ` · ${formatDate(
                              item.occurred_at
                            )}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {item.score !== null && (
                        <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                          {Number(
                            item.score
                          ).toFixed(2)}
                          %
                        </span>
                      )}

                      {item.status && (
                        <StatusBadge
                          status={item.status}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* DANGER ZONE */}

          <ResetTraineeProgress
            learnerId={learnerId}
            programId={program.id}
            traineeName={traineeName}
          />
        </main>
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow-xs)]">
      <p className="text-[12px] font-medium text-[var(--text-secondary)]">
        {label}
      </p>

      <p className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
        {helper}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
      <div>
        <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          {title}
        </h2>

        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <span className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
        {count}
      </span>
    </div>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-7 text-[12px] text-[var(--text-muted)] sm:px-6">
      {children}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized =
    status?.toLowerCase() ??
    "not_started";

  let styles =
    "bg-[#F2F4F7] text-[var(--text-secondary)]";

  if (
    normalized === "completed" ||
    normalized === "passed"
  ) {
    styles =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "in_progress" ||
    normalized === "submitted"
  ) {
    styles =
      "bg-[#EAF8FA] text-[#07879B]";
  }

  if (normalized === "needs_review") {
    styles =
      "bg-amber-50 text-amber-700";
  }

  if (
    normalized === "failed" ||
    normalized === "not_passed"
  ) {
    styles =
      "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${styles}`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function getInitials(
  fullName: string,
  email: string
) {
  if (fullName && fullName !== "Trainee") {
    return (
      fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) =>
          part.charAt(0).toUpperCase()
        )
        .join("") || "T"
    );
  }

  return email?.charAt(0).toUpperCase() || "T";
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatLabel(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}