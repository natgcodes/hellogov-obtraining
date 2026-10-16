"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";

type Props = {
  initialEnabled: boolean;
};

export default function CertificationAccessControl({
  initialEnabled,
}: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    if (saving) return;

    const newEnabled = !enabled;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: updateError } = await supabase.rpc(
        "set_program_certification_enabled",
        {
          target_program_id: HELLOGOV_PROGRAM_ID,
          new_enabled: newEnabled,
        }
      );

      if (updateError) {
        throw updateError;
      }

      setEnabled(data === true);
      router.refresh();
    } catch (err) {
      console.error("Unable to update certification access:", err);

      setError(
        "Unable to update certification access. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-7 rounded-[18px] border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow-xs)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
            Certification Access
          </h2>

          <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">
            Control when trainees can access their final certification.
            Only trainees who have completed all training days will
            be able to open it.
          </p>

          <p className="mt-2 text-[12px] font-medium text-[var(--text-secondary)]">
            Current status:{" "}
            <span
              className={
                enabled
                  ? "font-semibold text-emerald-700"
                  : "font-semibold text-slate-500"
              }
            >
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-[10px] px-4 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled
              ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              : "bg-[#08A9C1] text-white hover:bg-[#0795AA]"
          }`}
        >
          {saving
            ? "Saving..."
            : enabled
              ? "Disable Certification"
              : "Enable Certification"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-[12px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}