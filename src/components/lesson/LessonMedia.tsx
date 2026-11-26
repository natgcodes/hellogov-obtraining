"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { lessonMedia, safeHttps, type LessonMaterial } from "@/lib/lesson/content";

export function LessonResourceLink({ material, label = "Open resource" }: { material: LessonMaterial; label?: string }) {
  // Uploaded files have a stable authenticated resource page for browser bookmarks.
  const href = material.lesson_asset_path ? `/learn/resource/${encodeURIComponent(material.id)}` : safeHttps(material.url);
  if (!href) return null;
  return <a className="inline-flex rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold !text-[var(--text-primary)]" href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}

export default function LessonMedia({ material, standalone = false }: { material: LessonMaterial; standalone?: boolean }) {
  const path = material.lesson_asset_path;
  const [signed, setSigned] = useState<{path:string;url:string} | null>(null);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!path) return;
    async function sign() {
      try { const { data, error: e } = await createClient().storage.from("lesson-content").createSignedUrl(path!, 1800);
      if (!cancelled) { if (e || !data?.signedUrl) setError("Unable to load this file. Check your access or try again."); else {setSigned({path:path!,url:data.signedUrl});setError("");} } } catch {if(!cancelled)setError("Unable to load this file. Try again.");}
    }
    void sign();
    return () => { cancelled = true; };
  }, [path, attempt]);
  const media = path ? (signed && signed.path === path ? { src:signed.url, mode:material.lesson_kind === "image" ? "image" : "frame", provider:"Uploaded file" } : null) : lessonMedia(material.lesson_kind, material.url);
  return <div className="space-y-2">
    {error || failed ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error || "This content could not be displayed."} <button type="button" className="underline" onClick={()=>{setFailed(false);setError("");setAttempt(a=>a+1);}}>Retry</button></div> : !media ? <div className="rounded-lg border p-4 text-sm text-slate-500">{path ? "Loading file…" : "No supported resource configured."}</div> : media.mode === "external" ? <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">This link cannot be embedded safely. Use Open resource below.</div> : media.mode === "image" ? (
      // Images are restricted to HTTPS or authorized signed Storage URLs, never injected HTML.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={media.src} alt={material.lesson_alt || material.title} className="mx-auto max-h-[700px] w-auto max-w-full rounded-xl object-contain" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>
    ) : <iframe key={`${media.src}:${attempt}`} src={media.src} title={material.title} loading="lazy" allowFullScreen allow="fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write" referrerPolicy="no-referrer" sandbox={path || media.provider === "External PDF" ? "allow-same-origin allow-downloads" : "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads"} className={`w-full rounded-xl border bg-slate-50 ${material.lesson_kind === "pdf" ? "h-[560px]" : "aspect-video"}`} onError={()=>setFailed(true)}/>}
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[var(--text-muted)]">{path ? "Access is limited to authorized users." : "If the embedded content does not load, open the original resource and sign in with your work account."}</p>{standalone ? (signed && signed.path === path && <a href={signed.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold underline">Open file ↗</a>) : <LessonResourceLink material={material}/>}</div>
  </div>;
}
