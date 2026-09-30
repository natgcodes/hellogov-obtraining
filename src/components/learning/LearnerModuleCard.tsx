import Link from "next/link";
import MaterialCard from "./MaterialCard";
import ActivityCard from "./ActivityCard";
import type {
  LearnerModule,
  ProgressMap,
} from "@/lib/learning/types";

type Props = {
  module: LearnerModule;
  progress: ProgressMap;
};

function getStatusStyles(status: string) {
  if (status === "completed") {
    return {
      label: "Completed",
      badge:
        "bg-[var(--success-soft)] text-[var(--success)]",
      dot: "bg-[var(--success)]",
    };
  }

  if (status === "in_progress") {
    return {
      label: "In progress",
      badge:
        "bg-[var(--warning-soft)] text-[var(--warning)]",
      dot: "bg-[var(--warning)]",
    };
  }

  return {
    label: "Not started",
    badge:
      "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
    dot: "bg-[var(--text-muted)]",
  };
}

export default function LearnerModuleCard({
  module,
  progress,
}: Props) {
  const status =
    progress.modules[module.id] ??
    "not_started";

  const statusStyle =
    getStatusStyles(status);

  const totalItems =
    module.materials.length +
    module.activities.length +
    module.quizzes.length;

  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white shadow-[var(--shadow-sm)]">
      {/* ===================================================
          MODULE HEADER
      =================================================== */}

      <div className="border-b border-[var(--border-soft)] px-6 py-6 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            {/* Metadata */}

            <div className="flex flex-wrap items-center gap-2">
              {module.duration_minutes && (
                <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {module.duration_minutes} min
                </span>
              )}

              {module.is_required && (
                <span className="inline-flex items-center rounded-full bg-[var(--teal-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--teal-deep)]">
                  Required
                </span>
              )}

              {totalItems > 0 && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {totalItems}{" "}
                  {totalItems === 1
                    ? "item"
                    : "items"}
                </span>
              )}
            </div>

            {/* Title */}

            <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {module.title}
            </h3>

            {/* Description */}

            {module.description && (
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[var(--text-secondary)]">
                {module.description}
              </p>
            )}

            {/* Objective */}

            {module.objective && (
              <div className="mt-5 max-w-3xl rounded-[12px] border border-[var(--teal-border)] bg-[var(--teal-soft)] px-4 py-3.5">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-[var(--teal)] shadow-[var(--shadow-xs)]">
                    ✓
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--teal-deep)]">
                      Learning objective
                    </p>

                    <p className="mt-1 text-[13px] leading-5 text-[var(--teal-deep)]">
                      {module.objective}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status */}

          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${statusStyle.badge}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
            />

            {statusStyle.label}
          </span>
        </div>
      </div>

      {/* ===================================================
          MODULE CONTENT
      =================================================== */}

      <div className="space-y-8 px-6 py-6 sm:px-7">
        {/* =================================================
            MATERIALS
        ================================================= */}

        {module.materials.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Materials
                </p>

                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  Review the resources for this
                  module.
                </p>
              </div>

              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {module.materials.length}
              </span>
            </div>

            <div className="space-y-3">
              {module.materials.map(
                (material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    moduleId={module.id}
                    completed={
                      progress.materials[
                        material.id
                      ] ?? false
                    }
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* =================================================
            ACTIVITIES
        ================================================= */}

        {module.activities.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Practice
                </p>

                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  Apply what you learned before
                  moving forward.
                </p>
              </div>

              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {module.activities.length}
              </span>
            </div>

            <div className="space-y-3">
              {module.activities.map(
                (activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    moduleId={module.id}
                    status={
                      progress.activities[
                        activity.id
                      ] ?? "not_started"
                    }
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* =================================================
            KNOWLEDGE CHECKS
        ================================================= */}

        {module.quizzes.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Knowledge checks
                </p>

                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  Check your understanding of the
                  module.
                </p>
              </div>

              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                {module.quizzes.length}
              </span>
            </div>

            <div className="space-y-3">
              {module.quizzes.map(
                (quiz) => (
                  <div
                    key={quiz.id}
                    className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 transition hover:border-[var(--teal-border)] hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[var(--teal-soft)] text-[13px] font-semibold text-[var(--teal-deep)]">
                            ?
                          </div>

                          <div className="min-w-0">
                            <h5 className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                              {quiz.title}
                            </h5>

                            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                              Passing score:{" "}
                              {quiz.passing_score}% ·{" "}
                              {quiz.max_attempts}{" "}
                              {quiz.max_attempts === 1
                                ? "attempt"
                                : "attempts"}
                            </p>
                          </div>
                        </div>

                        {quiz.description && (
                          <p className="mt-3 max-w-2xl text-[12px] leading-5 text-[var(--text-secondary)]">
                            {quiz.description}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/learn/quiz/${quiz.id}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-[9px] bg-[var(--teal)] px-4 py-2.5 text-[12px] font-semibold !text-white transition hover:bg-[var(--teal-deep)] hover:!text-white"
                      >
                        Start quiz
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* =================================================
            EMPTY MODULE
        ================================================= */}

        {totalItems === 0 && (
          <div className="rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-5 py-8 text-center">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              Content coming soon
            </p>

            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Training materials have not been
              added to this module yet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}