"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SetupItem } from "@/lib/learning/types";

type Props = {
  items: SetupItem[];
  progress: Record<string, boolean>;
};

export default function SetupChecklist({
  items,
  progress,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState<string | null>(null);

  async function toggleItem(
    itemId: string,
    currentValue: boolean
  ) {
    setSaving(itemId);

    const { error } = await supabase.rpc(
      "set_setup_item_complete",
      {
        target_setup_item_id: itemId,
        target_completed: !currentValue,
      }
    );

    setSaving(null);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
          Before Day 1
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          Tool Setup
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Complete the required setup before beginning training.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const completed = progress[item.id] ?? false;
          const isSaving = saving === item.id;

          return (
            <button
              key={item.id}
              type="button"
              disabled={isSaving}
              onClick={() => toggleItem(item.id, completed)}
              className="flex w-full items-start gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  completed
                    ? "border-[#e84545] bg-[#e84545] text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
              >
                ✓
              </div>

              <div>
                <div className="font-medium text-slate-900">
                  {item.title}
                  {item.is_required && (
                    <span className="ml-2 text-xs text-[#e84545]">
                      Required
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}