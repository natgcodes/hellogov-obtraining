"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  attemptId: string;
  moduleId?: string | null;
  isFinalized?: boolean;
};

type FinalizeResult = {
  score: number;
  passed: boolean;
  status: string;
  module_status: string | null;
  program_status: string;
};

export default function FinalizeReviewButton({
  attemptId,
  isFinalized = false,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinalizeResult | null>(null);

  async function handleFinalize() {
    if (loading || isFinalized || result) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: finalizeError } = await supabase.rpc(
        "finalize_quiz_review_with_progress",
        {
          target_attempt_id: attemptId,
        }
      );

      if (finalizeError) throw finalizeError;

      const finalResult = data?.[0] as FinalizeResult | undefined;

      if (!finalResult) {
        throw new Error(
          "No result was returned after finalizing the review."
        );
      }

      setResult(finalResult);
      router.refresh();
    } catch (err) {
      console.error("Finalize review error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to finalize this review."
      );
    } finally {
      setLoading(false);
    }
  }

  if (isFinalized) {
    return (
      <span className="inline-flex rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
        Review completed
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleFinalize}
        disabled={loading || result !== null}
        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Finalizing..."
          : result
            ? "Review completed"
            : "Finalize review"}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">
            Review finalized successfully.
          </p>

          <p className="mt-1 text-xs">
            Score: {Number(result.score).toFixed(2)}% ·{" "}
            {result.passed ? "Passed" : "Not passed"}
          </p>
        </div>
      )}
    </div>
  );
}