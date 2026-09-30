"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LearnerMaterial } from "@/lib/learning/types";

type Props = {
  material: LearnerMaterial;
  completed: boolean;
  moduleId: string;
};

function getMaterialIcon(type: string) {
  const normalized = type
    .toLowerCase()
    .trim();

  if (
    normalized.includes("video") ||
    normalized.includes("loom")
  ) {
    return "▶";
  }

  if (
    normalized.includes("document") ||
    normalized.includes("pdf") ||
    normalized.includes("reading")
  ) {
    return "▤";
  }

  if (
    normalized.includes("link") ||
    normalized.includes("website")
  ) {
    return "↗";
  }

  if (
    normalized.includes("slide") ||
    normalized.includes("presentation")
  ) {
    return "▥";
  }

  return "◇";
}

function getMaterialLabel(type: string) {
  if (!type) {
    return "Resource";
  }

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

export default function MaterialCard({
  material,
  completed,
  moduleId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] =
    useState(false);

  // ---------------------------------------------------------
  // MATERIAL COMPLETION
  // ---------------------------------------------------------

  async function setComplete(
    value: boolean
  ) {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const {
        error: materialError,
      } = await supabase.rpc(
        "set_material_complete",
        {
          target_material_id:
            material.id,
          target_completed: value,
        }
      );

      if (materialError) {
        console.error(
          "Unable to update material progress:",
          materialError
        );

        alert(materialError.message);
        return;
      }

      const {
        error: moduleProgressError,
      } = await supabase.rpc(
        "recalculate_module_progress",
        {
          target_module_id: moduleId,
        }
      );

      if (moduleProgressError) {
        console.error(
          "Unable to recalculate module progress:",
          moduleProgressError
        );

        alert(
          "The material was updated, but the module progress could not be recalculated. Please refresh and try again."
        );
      }

      router.refresh();
    } catch (updateError) {
      console.error(
        "Unexpected error updating material progress:",
        updateError
      );

      alert(
        "Unable to update this material. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const materialIcon =
    getMaterialIcon(
      material.material_type
    );

  const materialLabel =
    getMaterialLabel(
      material.material_type
    );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div
      className={`group rounded-[14px] border px-4 py-4 transition ${
        completed
          ? "border-[var(--teal-border)] bg-[var(--teal-soft)]/40"
          : "border-[var(--border)] bg-white hover:border-[var(--teal-border)]"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* =================================================
            ICON
        ================================================= */}

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[14px] font-semibold ${
            completed
              ? "bg-[var(--teal)] text-white"
              : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
          }`}
        >
          {completed
            ? "✓"
            : materialIcon}
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              {materialLabel}
            </span>

            {material.is_required && (
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

          <h4 className="mt-1 text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
            {material.title}
          </h4>

          {material.description && (
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[var(--text-secondary)]">
              {material.description}
            </p>
          )}
        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {material.url && (
            <a
              href={material.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-[9px] border border-[var(--border)] bg-white px-3.5 text-[12px] font-semibold !text-[var(--text-primary)] transition hover:border-[var(--teal-border)] hover:bg-[var(--surface-soft)]"
            >
              Open resource
              <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                ↗
              </span>
            </a>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              setComplete(!completed)
            }
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
                : "Mark complete"}
          </button>
        </div>
      </div>
    </div>
  );
}