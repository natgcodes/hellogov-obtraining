"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SetupItem } from "@/lib/learning/types";

type Props = {
  items: SetupItem[];
  progress: Record<string, boolean>;
  programId: string;
  title?: string | null;
  description?: string | null;
  instructions?: string | null;
  readOnly?: boolean;
};

export default function SetupChecklist({
  items,
  progress,
  programId,
  title,
  description,
  instructions,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  // ---------------------------------------------------------
  // LOCAL / OPTIMISTIC STATE
  // ---------------------------------------------------------

  const [localProgress, setLocalProgress] =
    useState<Record<string, boolean>>(progress);

  const [savingItems, setSavingItems] =
    useState<Set<string>>(new Set());

  // ---------------------------------------------------------
  // TOGGLE SETUP ITEM
  // ---------------------------------------------------------

  async function toggleItem(itemId: string) {
    if (readOnly) {
      return;
    }

    if (savingItems.has(itemId)) {
      return;
    }

    const currentValue =
      localProgress[itemId] ?? false;

    const nextValue = !currentValue;

    // -------------------------------------------------------
    // 1. OPTIMISTIC UI UPDATE
    // -------------------------------------------------------

    setLocalProgress((current) => ({
      ...current,
      [itemId]: nextValue,
    }));

    setSavingItems((current) => {
      const next = new Set(current);
      next.add(itemId);
      return next;
    });

    try {
      // -----------------------------------------------------
      // 2. SAVE SETUP ITEM
      // -----------------------------------------------------

      const { error: setupError } =
        await supabase.rpc(
          "set_setup_item_complete",
          {
            target_setup_item_id: itemId,
            target_completed: nextValue,
          }
        );

      if (setupError) {
        throw setupError;
      }

      // -----------------------------------------------------
      // 3. RECALCULATE PROGRAM ENROLLMENT
      // -----------------------------------------------------

      const { error: enrollmentError } =
        await supabase.rpc(
          "recalculate_program_enrollment",
          {
            target_program_id: programId,
          }
        );

      if (enrollmentError) {
        console.error(
          "Unable to recalculate program enrollment:",
          enrollmentError
        );
      }

      // -----------------------------------------------------
      // 4. REFRESH SERVER COMPONENTS
      // -----------------------------------------------------

      router.refresh();
    } catch (error) {
      console.error(
        "Unable to update setup item:",
        error
      );

      setLocalProgress((current) => ({
        ...current,
        [itemId]: currentValue,
      }));

      alert(
        error instanceof Error
          ? error.message
          : "Unable to update this setup item. Please try again."
      );
    } finally {
      setSavingItems((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
    }
  }

  // ---------------------------------------------------------
  // PROGRESS COUNTS
  // ---------------------------------------------------------

  const completedCount = items.filter(
    (item) =>
      localProgress[item.id] ?? false
  ).length;

  const totalCount = items.length;

  const allComplete =
    totalCount > 0 &&
    completedCount === totalCount;

  const displayTitle =
    title?.trim() || "Tool Setup";

  const displayDescription =
    description?.trim() ||
    "Complete the recommended setup before beginning training.";

  const displayInstructions =
    instructions?.trim() || "";

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
              Before Day 1
            </p>

            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              {displayTitle}
            </h2>

            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-[var(--text-secondary)]">
              {displayDescription}
            </p>
          </div>

          <div
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
              allComplete
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
            }`}
          >
            {allComplete && (
              <span aria-hidden="true">
                ✓
              </span>
            )}

            <span>
              {completedCount} of {totalCount}{" "}
              complete
            </span>
          </div>
        </div>

        {/* =================================================
            INSTRUCTIONS
        ================================================= */}

        {displayInstructions && (
          <div className="mt-5 rounded-[14px] border border-[#08A9C1]/20 bg-[#F2FBFC] px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#E2F6F8] text-[#07879B]">
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
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />

                  <path d="M12 11v5" />
                  <path d="M12 8h.01" />
                </svg>
              </div>

              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#086F80]">
                  Instructions
                </p>

                <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-[var(--text-secondary)]">
                  {displayInstructions}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================
          ITEMS
      =================================================== */}

      <div className="border-t border-[var(--border-soft)]">
        {items.map((item, index) => {
          const completed =
            localProgress[item.id] ?? false;

          const isSaving =
            savingItems.has(item.id);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                toggleItem(item.id)
              }
              disabled={
                isSaving || readOnly
              }
              aria-pressed={completed}
              className={`group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors sm:px-6 ${
                index !== 0
                  ? "border-t border-[var(--border-soft)]"
                  : ""
              } ${
                readOnly
                  ? "cursor-default"
                  : isSaving
                    ? "cursor-wait"
                    : "cursor-pointer hover:bg-[var(--surface-soft)]/70"
              }`}
            >
              {/* STATUS */}

              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition ${
                  completed
                    ? "bg-[var(--success)] text-white"
                    : "border border-[var(--border)] bg-white text-transparent group-hover:border-[var(--teal)]"
                }`}
              >
                ✓
              </div>

              {/* CONTENT */}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </span>

                  {item.is_required && (
                    <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                      Required
                    </span>
                  )}

                  {isSaving && (
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                      Saving...
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                )}
              </div>

              {/* RIGHT STATUS */}

              <div className="hidden shrink-0 sm:block">
                <span
                  className={`text-[11px] font-medium ${
                    completed
                      ? "text-[var(--success)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {completed
                    ? "Complete"
                    : readOnly
                      ? "Incomplete"
                      : "Mark complete"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}