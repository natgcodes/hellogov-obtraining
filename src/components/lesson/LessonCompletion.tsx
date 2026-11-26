"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LessonMaterial } from "@/lib/lesson/content";
export default function LessonCompletion({ material, completed, readOnly=false }: { material:LessonMaterial;completed:boolean;readOnly?:boolean }) {
  const router=useRouter(); const [saving,setSaving]=useState(false), [error,setError]=useState("");
  if (!material.lesson_tracking) return null;
  async function complete() {
    if (saving||readOnly||completed) return;
    setSaving(true);setError("");
    try {const {error:e}=await createClient().rpc("hg_set_lesson_complete",{target_material_id:material.id}); if(e) throw e;router.refresh();}
    catch(e){setError(typeof e==="object"&&e&&"message" in e?String(e.message):"Unable to save completion. Try again.");}
    finally{setSaving(false);}
  }
  return <div className="border-t border-[var(--border-soft)] pt-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--text-muted)]">{completed ? "Completion saved." : material.lesson_kind === "bookmarks" ? "Confirm after saving the listed resources in your browser's bookmarks." : "Mark this content as completed when you have finished reviewing it."}</p>{completed ? <span className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-xs font-semibold text-[var(--success)]">✓ Completed</span> : readOnly ? <span className="rounded-lg border px-3 py-2 text-xs text-[var(--text-muted)]">Incomplete · Read-only</span> : <button type="button" disabled={saving} onClick={complete} className="rounded-lg bg-[var(--teal)] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving?"Saving…":"Mark as completed"}</button>}</div>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
