"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  questionId: string;
  answered: boolean;
};

export default function QuestionStatusButton({
  questionId,
  answered,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange() {
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Could not verify your account.");
        return;
      }

      const updateData = answered
        ? {
            status: "open",
            answered_by: null,
            answered_at: null,
          }
        : {
            status: "answered",
            answered_by: user.id,
            answered_at: new Date().toISOString(),
          };

      const { error: updateError } = await supabase
        .from("training_questions")
        .update(updateData)
        .eq("id", questionId);

      if (updateError) {
        console.error(
          "Unable to update question status:",
          updateError
        );

        setError("Could not update this question.");
        return;
      }

      router.refresh();
    } catch (statusError) {
      console.error(
        "Unexpected error updating question:",
        statusError
      );

      setError("Could not update this question.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handleStatusChange}
        disabled={saving}
        className={
          answered
            ? "inline-flex h-7 items-center justify-center rounded-[7px] border border-[var(--border)] bg-white px-2.5 text-[9.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex h-7 items-center justify-center rounded-[7px] border border-[#08A9C1]/30 bg-[#08A9C1]/10 px-2.5 text-[9.5px] font-semibold text-[#07879A] transition-colors hover:bg-[#08A9C1]/15 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {saving
          ? "Saving..."
          : answered
            ? "Reopen"
            : "Mark as resolved"}
      </button>

      {error && (
        <p className="max-w-[160px] text-center text-[9px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}