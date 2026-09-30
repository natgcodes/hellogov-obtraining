"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SetupItem } from "@/lib/learning/types";

type Props = {
  items: SetupItem[];
  progress: Record<string, boolean>;
  programId: string;
};

export default function SetupChecklist({
  items,
  progress,
  programId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  // ---------------------------------------------------------
  // LOCAL / OPTIMISTIC STATE
  //
  // Update the checklist immediately while the database
  // operation continues in the background.
  // ---------------------------------------------------------

  const [localProgress, setLocalProgress] =
    useState<Record<string, boolean>>(
      progress
    );

  const [savingItems, setSavingItems] =
    useState<Set<string>>(new Set());

  // ---------------------------------------------------------
  // TOGGLE SETUP ITEM
  // ---------------------------------------------------------

  async function toggleItem(
    itemId: string
  ) {
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
      //
      // This may affect day unlocking and overall progress.
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
      //
      // The checkbox already changed instantly through the
      // optimistic state above. This refresh synchronizes
      // AppShell, journey state, progress, and day unlocking.
      // -----------------------------------------------------

      router.refresh();
    } catch (error) {
      console.error(
        "Unable to update setup item:",
        error
      );

      // -----------------------------------------------------
      // SAVE FAILED:
      // Restore the previous visual state.
      // -----------------------------------------------------

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

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
            Before Day 1
          </p>

          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
            Tool Setup
          </h2>

          <p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)]">
            Complete the recommended setup before
            beginning training.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
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
              disabled={isSaving}
              aria-pressed={completed}
              className={`group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors sm:px-6 ${
                index !== 0
                  ? "border-t border-[var(--border-soft)]"
                  : ""
              } ${
                isSaving
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