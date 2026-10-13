"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  checkpointId: string;
  completed: boolean;
};

export default function CheckpointCompletionButton({
  checkpointId,
  completed,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [isSaving, setIsSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleComplete() {
    if (completed || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { error } = await supabase.rpc(
      "mark_checkpoint_completed",
      {
        target_checkpoint_id:
          checkpointId,
      }
    );

    if (error) {
      console.error(
        "Unable to mark checkpoint as completed:",
        error
      );

      setErrorMessage(
        "We couldn't save your progress. Please try again."
      );

      setIsSaving(false);
      return;
    }

    router.refresh();
    setIsSaving(false);
  }

  if (completed) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="inline-flex min-w-[138px] items-center justify-center gap-2 rounded-[9px] bg-[var(--success-soft)] px-4 py-2.5 text-[11px] font-semibold text-[var(--success)]">
          <span aria-hidden="true">
            ✓
          </span>

          Completed
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleComplete}
        disabled={isSaving}
        className="inline-flex min-w-[138px] items-center justify-center rounded-[9px] border border-[var(--teal)] bg-white px-4 py-2.5 text-[11px] font-semibold text-[var(--teal-deep)] transition hover:bg-[var(--teal-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving
          ? "Saving..."
          : "Mark as completed"}
      </button>

      {errorMessage && (
        <p className="max-w-[190px] text-right text-[10px] leading-4 text-[var(--hellogov-red)]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}