"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  programId: string;
  status: string;
};

export default function ProgramPublishControl({
  programId,
  status,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const published = status === "published";

  async function changeStatus() {
    setSaving(true);
    setError(null);

    const { error } = await supabase.rpc(
      "set_program_status",
      {
        target_program_id: programId,
        target_status: published
          ? "draft"
          : "published",
      }
    );

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Program status
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {published
              ? "Published"
              : "Draft"}
          </p>
        </div>

        <span
          className={`h-2.5 w-2.5 rounded-full ${
            published
              ? "bg-emerald-500"
              : "bg-amber-400"
          }`}
        />
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={changeStatus}
        className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${
          published
            ? "border border-slate-200 bg-white text-slate-700"
            : "bg-[#e84545] text-white"
        } disabled:opacity-50`}
      >
        {saving
          ? "Saving..."
          : published
            ? "Return to draft"
            : "Publish program"}
      </button>

      {error && (
        <p className="mt-3 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}