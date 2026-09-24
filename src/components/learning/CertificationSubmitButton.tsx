"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CertificationSubmitButton({ componentId, submitted }: { componentId: string; submitted: boolean }) {
  const router = useRouter(); const supabase = createClient();
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  async function submit(){setBusy(true);setError(null);const {error}=await supabase.rpc("submit_certification_component",{target_component_id:componentId});setBusy(false);if(error){setError(error.message);return;}router.refresh();}
  return <div className="mt-4"><button type="button" onClick={submit} disabled={busy||submitted} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitted?"Submitted for trainer review":busy?"Submitting...":"Submit for review"}</button>{error&&<p className="mt-2 text-sm text-red-600">{error}</p>}</div>;
}
