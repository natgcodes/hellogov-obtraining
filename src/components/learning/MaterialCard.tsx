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

export default function MaterialCard({
  material,
  completed,
  moduleId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);

  async function setComplete(value: boolean) {
    setSaving(true);

    const { error } = await supabase.rpc(
      "set_material_complete",
      {
        target_material_id: material.id,
        target_completed: value,
      }
    );

    if (!error) {
      await supabase.rpc("recalculate_module_progress", {
        target_module_id: moduleId,
      });
    }

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {material.material_type}
            </span>

            {material.is_required && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-[#e84545]">
                Required
              </span>
            )}
          </div>

          <h4 className="font-semibold text-slate-900">
            {material.title}
          </h4>

          {material.description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {material.description}
            </p>
          )}
        </div>

        {completed && (
          <span className="text-sm font-semibold text-emerald-600">
            ✓ Complete
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {material.url && (
          <a
            href={material.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Open material
          </a>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() => setComplete(!completed)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : completed
              ? "Mark incomplete"
              : "Mark complete"}
        </button>
      </div>
    </div>
  );
}