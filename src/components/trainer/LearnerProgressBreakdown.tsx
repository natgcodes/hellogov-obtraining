"use client";

import { useState } from "react";
import Link from "next/link";

export type DayProgress = {
  day_id: string;
  day_number: number;
  day_title: string;
  day_position: number;
  day_status: string;
};

export type ModuleProgress = {
  day_id: string;
  module_id: string;
  module_title: string;
  module_position: number;
  is_required: boolean;
  module_status: string;
};

export type TrainingItem = {
  id: string;
  module_id: string;
  title: string;
  type: "material" | "activity" | "quiz";
  position: number;
  is_required: boolean;
  status: string;
  completed: boolean;
  attempt_id?: string | null;
  score?: number | null;
};

export type CheckpointProgress = {
  checkpoint_id: string;
  day_id: string;
  checkpoint_title: string;
  checkpoint_position: number;
  checkpoint_type: string;
  is_required: boolean;
  checkpoint_status: string;
  quiz_attempt_id: string | null;
  quiz_attempt_status: string | null;
  score: number | null;
};

type Props = {
  days: DayProgress[];
  modules: ModuleProgress[];
  items: TrainingItem[];
  checkpoints: CheckpointProgress[];
};

export default function LearnerProgressBreakdown({
  days,
  modules,
  items,
  checkpoints,
}: Props) {
  const firstActiveDay =
    days.find(
      (day) =>
        day.day_status === "in_progress"
    )?.day_id ??
    days.find(
      (day) =>
        day.day_status !== "completed"
    )?.day_id ??
    days[0]?.day_id;

  const [openDay, setOpenDay] = useState<string | null>(
    firstActiveDay ?? null
  );

  const [openModules, setOpenModules] = useState<
    string[]
  >([]);

  function toggleModule(moduleId: string) {
    setOpenModules((current) =>
      current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId]
    );
  }

  return (
    <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
      <div className="border-b border-[var(--border-soft)] px-5 py-5 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
          Learning Journey
        </p>

        <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          Training Progress Breakdown
        </h2>

        <p className="mt-1 text-[12px] text-[var(--text-muted)]">
          Track module completion, learning activities,
          assessments, and checkpoints for each training day.
        </p>
      </div>

      {days.length === 0 ? (
        <div className="px-6 py-8 text-[12px] text-[var(--text-muted)]">
          No training days are available.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-soft)]">
          {days.map((day) => {
            const dayModules = modules.filter(
              (module) =>
                module.day_id === day.day_id
            );

            const dayCheckpoints = checkpoints.filter(
              (checkpoint) =>
                checkpoint.day_id === day.day_id
            );

            const requiredModules = dayModules.filter(
              (module) => module.is_required
            );

            const completedModules =
              requiredModules.filter(
                (module) =>
                  module.module_status === "completed"
              ).length;

            const completedCheckpoints =
              dayCheckpoints.filter(
                (checkpoint) =>
                  checkpoint.is_required &&
                  isCheckpointComplete(checkpoint)
              ).length;

            const requiredCheckpoints =
              dayCheckpoints.filter(
                (checkpoint) =>
                  checkpoint.is_required
              );

            const totalRequirements =
              requiredModules.length +
              requiredCheckpoints.length;

            const completedRequirements =
              completedModules +
              completedCheckpoints;

            const dayPercent =
              totalRequirements > 0
                ? Math.round(
                    (completedRequirements /
                      totalRequirements) *
                      100
                  )
                : 0;

            const isOpen =
              openDay === day.day_id;

            return (
              <div key={day.day_id}>
                {/* DAY HEADER */}

                <button
                  type="button"
                  onClick={() =>
                    setOpenDay(
                      isOpen ? null : day.day_id
                    )
                  }
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-[#FAFCFC] sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EAF8FA] text-[12px] font-semibold text-[#07879B]">
                      {day.day_number}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
                        Day {day.day_number}
                      </p>

                      <h3 className="mt-0.5 text-[14px] font-semibold text-[var(--text-primary)]">
                        {day.day_title}
                      </h3>

                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {completedModules}/
                        {requiredModules.length} modules
                        {" · "}
                        {completedCheckpoints}/
                        {requiredCheckpoints.length} checkpoints
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-[13px] font-semibold text-[var(--text-primary)] sm:inline">
                      {dayPercent}%
                    </span>

                    <StatusBadge
                      status={day.day_status}
                    />

                    <span className="text-[var(--text-muted)]">
                      {isOpen ? "⌃" : "⌄"}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border-soft)] bg-[#FBFCFD] px-4 py-5 sm:px-6">
                    {/* DAY PROGRESS */}

                    <div className="mb-6">
                      <div className="mb-2 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[var(--text-secondary)]">
                          Day progress
                        </span>

                        <span className="font-semibold text-[var(--text-primary)]">
                          {dayPercent}%
                        </span>
                      </div>

                      <ProgressBar value={dayPercent} />
                    </div>

                    {/* MODULES */}

                    <div>
                      <h4 className="mb-3 text-[12px] font-semibold text-[var(--text-primary)]">
                        Modules
                      </h4>

                      {dayModules.length === 0 ? (
                        <EmptyMessage>
                          No modules available.
                        </EmptyMessage>
                      ) : (
                        <div className="space-y-3">
                          {dayModules.map((module) => {
                            const moduleItems =
                              items.filter(
                                (item) =>
                                  item.module_id ===
                                  module.module_id
                              );

                            const requiredItems =
                              moduleItems.filter(
                                (item) =>
                                  item.is_required
                              );

                            const completedItems =
                              requiredItems.filter(
                                (item) =>
                                  item.completed
                              ).length;

                            const modulePercent =
                              requiredItems.length > 0
                                ? Math.round(
                                    (completedItems /
                                      requiredItems.length) *
                                      100
                                  )
                                : module.module_status ===
                                    "completed"
                                  ? 100
                                  : 0;

                            const expanded =
                              openModules.includes(
                                module.module_id
                              );

                            const materials =
                              moduleItems.filter(
                                (item) =>
                                  item.type === "material"
                              );

                            const activities =
                              moduleItems.filter(
                                (item) =>
                                  item.type === "activity"
                              );

                            const quizzes =
                              moduleItems.filter(
                                (item) =>
                                  item.type === "quiz"
                              );

                            return (
                              <div
                                key={module.module_id}
                                className="overflow-hidden rounded-[13px] border border-[var(--border)] bg-white"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleModule(
                                      module.module_id
                                    )
                                  }
                                  aria-expanded={expanded}
                                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-[#FAFCFC]"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                                        {module.module_title}
                                      </p>

                                      <StatusBadge
                                        status={
                                          module.module_status
                                        }
                                      />
                                    </div>

                                    <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                                      {completedItems}/
                                      {requiredItems.length} required
                                      items completed
                                    </p>

                                    <div className="mt-3 max-w-[320px]">
                                      <ProgressBar
                                        value={modulePercent}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-3">
                                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                                      {modulePercent}%
                                    </span>

                                    <span className="text-[var(--text-muted)]">
                                      {expanded ? "⌃" : "⌄"}
                                    </span>
                                  </div>
                                </button>

                                {expanded && (
                                  <div className="border-t border-[var(--border-soft)] px-4 py-4">
                                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                                      <MiniMetric
                                        label="Materials"
                                        items={materials}
                                      />

                                      <MiniMetric
                                        label="Activities"
                                        items={activities}
                                      />

                                      <MiniMetric
                                        label="Quizzes"
                                        items={quizzes}
                                      />
                                    </div>

                                    <div className="space-y-4">
                                      <ItemGroup
                                        title="Learning Materials"
                                        items={materials}
                                      />

                                      <ItemGroup
                                        title="Activities"
                                        items={activities}
                                      />

                                      <ItemGroup
                                        title="Quizzes"
                                        items={quizzes}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* CHECKPOINTS */}

                    <div className="mt-7">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-[12px] font-semibold text-[var(--text-primary)]">
                          Checkpoints
                        </h4>

                        <span className="text-[11px] font-medium text-[var(--text-muted)]">
                          {completedCheckpoints}/
                          {requiredCheckpoints.length} completed
                        </span>
                      </div>

                      {dayCheckpoints.length === 0 ? (
                        <EmptyMessage>
                          No checkpoints for this day.
                        </EmptyMessage>
                      ) : (
                        <div className="overflow-hidden rounded-[13px] border border-[var(--border)] bg-white">
                          {dayCheckpoints.map(
                            (checkpoint, index) => (
                              <div
                                key={
                                  checkpoint.checkpoint_id
                                }
                                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 ${
                                  index > 0
                                    ? "border-t border-[var(--border-soft)]"
                                    : ""
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-[var(--text-primary)]">
                                    {
                                      checkpoint.checkpoint_title
                                    }
                                  </p>

                                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                                    {formatLabel(
                                      checkpoint.checkpoint_type
                                    )}
                                    {checkpoint.is_required
                                      ? " · Required"
                                      : " · Optional"}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {checkpoint.score !==
                                    null && (
                                    <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                                      {checkpoint.score.toFixed(
                                        2
                                      )}
                                      %
                                    </span>
                                  )}

                                  <StatusBadge
                                    status={
                                      isCheckpointComplete(
                                        checkpoint
                                      )
                                        ? "completed"
                                        : checkpoint.quiz_attempt_status ??
                                          checkpoint.checkpoint_status
                                    }
                                  />

                                  {checkpoint.quiz_attempt_status ===
                                    "needs_review" &&
                                    checkpoint.quiz_attempt_id && (
                                      <Link
                                        href={`/trainer/review/${checkpoint.quiz_attempt_id}`}
                                        className="rounded-[8px] px-2 py-1 text-[11px] font-semibold !text-[#07879B] hover:bg-[#EAF8FA]"
                                      >
                                        Review →
                                      </Link>
                                    )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function isCheckpointComplete(
  checkpoint: CheckpointProgress
) {
  if (checkpoint.quiz_attempt_id) {
    return [
      "submitted",
      "needs_review",
      "graded",
      "completed",
    ].includes(
      checkpoint.quiz_attempt_status ?? ""
    );
  }

  return checkpoint.checkpoint_status === "completed";
}

function ItemGroup({
  title,
  items,
}: {
  title: string;
  items: TrainingItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
        {title}
      </p>

      <div className="overflow-hidden rounded-[10px] border border-[var(--border-soft)]">
        {items.map((item, index) => (
          <div
            key={`${item.type}-${item.id}`}
            className={`flex flex-wrap items-center justify-between gap-3 bg-white px-3.5 py-3 ${
              index > 0
                ? "border-t border-[var(--border-soft)]"
                : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[var(--text-primary)]">
                {item.title}
              </p>

              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                {formatLabel(item.type)}
                {item.is_required
                  ? " · Required"
                  : " · Optional"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {item.score !== undefined &&
                item.score !== null && (
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                    {item.score.toFixed(2)}%
                  </span>
                )}

              <StatusBadge status={item.status} />

              {item.status === "needs_review" &&
                item.attempt_id && (
                  <Link
                    href={`/trainer/review/${item.attempt_id}`}
                    className="rounded-[8px] px-2 py-1 text-[11px] font-semibold !text-[#07879B] hover:bg-[#EAF8FA]"
                  >
                    Review →
                  </Link>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  items,
}: {
  label: string;
  items: TrainingItem[];
}) {
  const required = items.filter(
    (item) => item.is_required
  );

  const completed = required.filter(
    (item) => item.completed
  ).length;

  return (
    <div className="rounded-[10px] bg-[#F7FAFB] px-3.5 py-3">
      <p className="text-[10px] font-medium text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 text-[16px] font-semibold text-[var(--text-primary)]">
        {completed}/{required.length}
      </p>
    </div>
  );
}

function ProgressBar({
  value,
}: {
  value: number;
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F4]">
      <div
        className="h-full rounded-full bg-[#08A9C1] transition-[width]"
        style={{
          width: `${Math.max(
            0,
            Math.min(100, value)
          )}%`,
        }}
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized =
    status?.toLowerCase() ?? "not_started";

  let styles =
    "bg-[#F2F4F7] text-[var(--text-secondary)]";

  if (
    normalized === "completed" ||
    normalized === "passed"
  ) {
    styles = "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "in_progress" ||
    normalized === "submitted"
  ) {
    styles = "bg-[#EAF8FA] text-[#07879B]";
  }

  if (normalized === "needs_review") {
    styles = "bg-amber-50 text-amber-700";
  }

  if (
    normalized === "failed" ||
    normalized === "not_passed"
  ) {
    styles = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${styles}`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function EmptyMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--border)] bg-white px-4 py-5 text-[11px] text-[var(--text-muted)]">
      {children}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}