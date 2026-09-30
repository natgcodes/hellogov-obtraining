"use client";

import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { LearnerDay } from "@/lib/learning/types";

type Props = {
  day: LearnerDay;
  unlocked: boolean;
  completed: boolean;
};

export default function LearnerDayCard({
  day,
  unlocked,
  completed,
}: Props) {
  const router = useRouter();

  const [opening, setOpening] =
    useState(false);

  const accessible =
    unlocked || completed;

  const isCurrent =
    unlocked && !completed;

  const moduleCount =
    day.modules.length;

  const totalMinutes =
    day.modules.reduce(
      (total, module) =>
        total +
        (module.duration_minutes ?? 0),
      0
    );

  const dayHref =
    `/learn/day/${day.id}`;

  // ---------------------------------------------------------
  // PREFETCH ACCESSIBLE DAY
  // ---------------------------------------------------------

  useEffect(() => {
    if (!accessible) {
      return;
    }

    router.prefetch(dayHref);
  }, [
    accessible,
    dayHref,
    router,
  ]);

  // ---------------------------------------------------------
  // DURATION
  // ---------------------------------------------------------

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

    const remainingMinutes =
      minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} ${
        hours === 1
          ? "hr"
          : "hrs"
      }`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  const duration =
    formatDuration(totalMinutes);

  // ---------------------------------------------------------
  // OPEN DAY
  // ---------------------------------------------------------

  function handleOpenDay() {
    if (
      !accessible ||
      opening
    ) {
      return;
    }

    setOpening(true);

    router.push(dayHref);
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <article
      className={`group overflow-hidden rounded-[14px] border transition ${
        completed
          ? "border-[var(--border)] bg-white"
          : isCurrent
            ? "border-[var(--teal)] bg-white shadow-[var(--shadow-sm)]"
            : "border-[var(--border)] bg-[var(--surface-soft)]"
      }`}
    >
      <div className="flex">
        {/* ===============================================
            STATUS RAIL
        =============================================== */}

        <div
          className={`flex w-[54px] shrink-0 items-start justify-center border-r pt-5 ${
            completed
              ? "border-[var(--border-soft)] bg-[var(--success-soft)]/40"
              : isCurrent
                ? "border-[var(--teal-soft)] bg-[var(--teal-soft)]/50"
                : "border-[var(--border-soft)] bg-[var(--surface-muted)]/50"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
              completed
                ? "border-[var(--success)] bg-[var(--success)] text-white"
                : isCurrent
                  ? "border-[var(--teal)] bg-[var(--teal)] text-white"
                  : "border-[var(--border-strong)] bg-white text-[var(--text-muted)]"
            }`}
          >
            {completed
              ? "✓"
              : isCurrent
                ? day.day_number
                : "•"}
          </div>
        </div>

        {/* ===============================================
            CONTENT
        =============================================== */}

        <div className="min-w-0 flex-1 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              {/* STATUS + DAY */}

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    isCurrent
                      ? "text-[var(--teal-deep)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  Day {day.day_number}
                </span>

                {completed && (
                  <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--success)]">
                    Completed
                  </span>
                )}

                {isCurrent && (
                  <span className="rounded-full bg-[var(--teal-soft)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--teal-deep)]">
                    Current
                  </span>
                )}

                {!accessible && (
                  <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
                    Locked
                  </span>
                )}
              </div>

              {/* TITLE */}

              <h3
                className={`mt-1.5 text-[16px] font-semibold tracking-[-0.015em] ${
                  accessible
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {day.title}
              </h3>

              {/* DESCRIPTION */}

              {day.description && (
                <p
                  className={`mt-1.5 max-w-[700px] text-[12px] leading-5 ${
                    accessible
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {day.description}
                </p>
              )}

              {/* META */}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--text-muted)]">
                <span>
                  {moduleCount}{" "}
                  {moduleCount === 1
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
                      Approx. {duration}
                    </span>
                  </>
                )}

                {isCurrent && (
                  <>
                    <span
                      className="h-1 w-1 rounded-full bg-[var(--border-strong)]"
                      aria-hidden="true"
                    />

                    <span className="font-medium text-[var(--teal-deep)]">
                      Ready to continue
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* =============================================
                ACTION
            ============================================= */}

            <div className="flex shrink-0 items-center self-center">
              {accessible ? (
                <button
                  type="button"
                  onClick={handleOpenDay}
                  disabled={opening}
                  className={`inline-flex min-w-[104px] items-center justify-center gap-2 rounded-[9px] px-4 py-2.5 text-[12px] font-semibold transition disabled:cursor-wait ${
                    isCurrent
                      ? "bg-[var(--teal)] !text-white hover:bg-[var(--teal-deep)] hover:!text-white disabled:opacity-80"
                      : "border border-[var(--border)] bg-white !text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:!text-[var(--text-primary)] disabled:opacity-70"
                  }`}
                >
                  {opening && (
                    <span
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
                      aria-hidden="true"
                    />
                  )}

                  {opening
                    ? "Opening..."
                    : completed
                      ? "Review day"
                      : "Continue"}
                </button>
              ) : (
                <div className="flex max-w-[165px] items-center gap-2 text-right text-[11px] leading-4 text-[var(--text-muted)]">
                  <span
                    className="shrink-0 text-[12px]"
                    aria-hidden="true"
                  >
                    ◇
                  </span>

                  <span>
                    Complete the previous
                    day to unlock
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}