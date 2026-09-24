"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { checkpointId: string; submitted: boolean };

export default function CheckpointSubmitButton({ checkpointId, submitted }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc("submit_checkpoint", { target_checkpoint_id: checkpointId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return <div className="mt-4">
    <button type="button" disabled={busy || submitted} onClick={submit}
      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
      {submitted ? "Submitted for trainer review" : busy ? "Submitting..." : "Submit checkpoint"}
    </button>
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>;
}
