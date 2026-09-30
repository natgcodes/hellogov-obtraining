"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LearnerActivity } from "@/lib/learning/types";

type Props = {
  activity: LearnerActivity;
  status: string;
  moduleId: string;
};

function getActivityLabel(type: string) {
  if (!type) {
    return "Activity";
  }

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function getActivityIcon(type: string) {
  const normalized = type
    .toLowerCase()
    .trim();

  if (
    normalized.includes("roleplay") ||
    normalized.includes("role_play") ||
    normalized.includes("role play")
  ) {
    return "◎";
  }

  if (
    normalized.includes("mock") ||
    normalized.includes("call")
  ) {
    return "◖";
  }

  if (
    normalized.includes("practice") ||
    normalized.includes("exercise")
  ) {
    return "✦";
  }

  if (
    normalized.includes("discussion") ||
    normalized.includes("group")
  ) {
    return "◌";
  }

  if (
    normalized.includes("shadow")
  ) {
    return "◉";
  }

  return "✦";
}

export default function ActivityCard({
  activity,
  status,
  moduleId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] =
    useState(false);

  const completed =
    status === "completed";

  const activityLabel =
    getActivityLabel(
      activity.activity_type
    );

  const activityIcon =
    getActivityIcon(
      activity.activity_type
    );

  // ---------------------------------------------------------
  // ACTIVITY COMPLETION
  // ---------------------------------------------------------

  async function toggleComplete() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const nextStatus = completed
        ? "not_started"
        : "completed";

      const {
        error: activityError,
      } = await supabase.rpc(
        "set_activity_status",
        {
          target_activity_id:
            activity.id,
          target_status: nextStatus,
          target_notes: null,
        }
      );

      if (activityError) {
        console.error(
          "Unable to update activity:",
          activityError
        );

        alert(activityError.message);
        return;
      }

      const {
        error: moduleError,
      } = await supabase.rpc(
        "recalculate_module_progress",
        {
          target_module_id: moduleId,
        }
      );

      if (moduleError) {
        console.error(
          "Unable to recalculate module progress:",
          moduleError
        );

        alert(
          "The activity was updated, but module progress could not be recalculated."
        );
      }

      router.refresh();
    } catch (error) {
      console.error(
        "Unexpected error updating activity:",
        error
      );

      alert(
        "Unable to update this activity. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div
      className={`rounded-[14px] border px-4 py-4 transition ${
        completed
          ? "border-[var(--teal-border)] bg-[var(--teal-soft)]/40"
          : "border-[var(--border)] bg-white hover:border-[var(--teal-border)]"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* =================================================
            ICON
        ================================================= */}

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[14px] font-semibold ${
            completed
              ? "bg-[var(--teal)] text-white"
              : "bg-[var(--teal-soft)] text-[var(--teal-deep)]"
          }`}
        >
          {completed
            ? "✓"
            : activityIcon}
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="min-w-0 flex-1">
          {/* Metadata */}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--teal-deep)]">
              {activityLabel}
            </span>

            {activity.duration_minutes !==
              null && (
              <>
                <span className="text-[var(--border)]">
                  ·
                </span>

                <span className="text-[10px] font-medium text-[var(--text-muted)]">
                  {
                    activity.duration_minutes
                  }{" "}
                  min
                </span>
              </>
            )}

            {activity.is_required && (
              <>
                <span className="text-[var(--border)]">
                  ·
                </span>

                <span className="text-[10px] font-semibold text-[var(--teal-deep)]">
                  Required
                </span>
              </>
            )}

            {completed && (
              <>
                <span className="text-[var(--border)]">
                  ·
                </span>

                <span className="text-[10px] font-semibold text-[var(--success)]">
                  Complete
                </span>
              </>
            )}
          </div>

          {/* Title */}

          <h4 className="mt-1 text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
            {activity.title}
          </h4>

          {/* Description */}

          {activity.description && (
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[var(--text-secondary)]">
              {activity.description}
            </p>
          )}

          {/* Instructions */}

          {activity.instructions && (
            <div className="mt-3 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Instructions
              </p>

              <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                {activity.instructions}
              </p>
            </div>
          )}
        </div>

        {/* =================================================
            ACTION
        ================================================= */}

        <div className="shrink-0 sm:pt-0.5">
          <button
            type="button"
            disabled={saving}
            onClick={toggleComplete}
            className={`inline-flex h-9 items-center justify-center rounded-[9px] px-3.5 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              completed
                ? "border border-[var(--border)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
                : "bg-[var(--teal)] text-white hover:bg-[var(--teal-deep)]"
            }`}
          >
            {saving
              ? "Saving..."
              : completed
                ? "Mark incomplete"
                : "Complete activity"}
          </button>
        </div>
      </div>
    </div>
  );
}