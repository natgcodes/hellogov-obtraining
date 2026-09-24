"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FinalizeReviewButtonProps = {
  attemptId: string;
  moduleId?: string;
};

type FinalizeResult = {
  score: number;
  passed: boolean;
  status: string;
  module_status: string;
  program_status: string;
};

export default function FinalizeReviewButton({
  attemptId,
}: FinalizeReviewButtonProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinalizeResult | null>(null);

  async function handleFinalize() {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: finalizeError } = await supabase.rpc(
        "finalize_quiz_review_with_progress",
        {
          target_attempt_id: attemptId,
        }
      );

      if (finalizeError) {
        throw finalizeError;
      }

      const finalResult = data?.[0] as FinalizeResult | undefined;

      if (!finalResult) {
        throw new Error("No result was returned after finalizing the review.");
      }

      setResult(finalResult);

      /*
       * Refresh is intentional here.
       *
       * Unlike the learner QuizPlayer bug we fixed earlier,
       * this does NOT start another quiz attempt.
       *
       * It refreshes the trainer review page so its server-rendered
       * attempt status/score reflect the newly graded attempt.
       */
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

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleFinalize}
        disabled={loading}
        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Finalizing..." : "Finalize review"}
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-900">
            Review finalized successfully.
          </p>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-emerald-800">
            <span>Score: {Number(result.score).toFixed(2)}%</span>

            <span>
              Result: {result.passed ? "Passed" : "Not passed"}
            </span>

            <span>
              Module: {formatStatus(result.module_status)}
            </span>

            <span>
              Program: {formatStatus(result.program_status)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}