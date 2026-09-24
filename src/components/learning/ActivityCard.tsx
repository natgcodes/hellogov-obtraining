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

export default function ActivityCard({
  activity,
  status,
  moduleId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);

  const completed = status === "completed";

  async function toggleComplete() {
    setSaving(true);

    const { error } = await supabase.rpc(
      "set_activity_status",
      {
        target_activity_id: activity.id,
        target_status: completed
          ? "not_started"
          : "completed",
        target_notes: null,
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
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {activity.activity_type}
            </span>

            {activity.duration_minutes && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {activity.duration_minutes} min
              </span>
            )}
          </div>

          <h4 className="font-semibold text-slate-900">
            {activity.title}
          </h4>

          {activity.description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {activity.description}
            </p>
          )}

          {activity.instructions && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              {activity.instructions}
            </div>
          )}
        </div>

        {completed && (
          <span className="shrink-0 text-sm font-semibold text-emerald-600">
            ✓ Complete
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={toggleComplete}
        className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {saving
          ? "Saving..."
          : completed
            ? "Mark incomplete"
            : "Complete activity"}
      </button>
    </div>
  );
}