import type { ReactNode } from "react";
import LessonMedia from "./LessonMedia";
import { LESSON_LABELS, MEDIA_KINDS, safeHttps, type LessonKind, type LessonMaterial } from "@/lib/lesson/content";

// A deliberately small Markdown subset; all authored text is rendered through React,
// not injected as HTML. Links use HTTPS only.
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\(https:\/\/[^)\s]+\))/g);
  return parts.map((p,i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1,-1)}</em>;
    if (p.startsWith("__") && p.endsWith("__") && p.length > 4) return <span key={i} className="underline">{p.slice(2,-2)}</span>;
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) return <code key={i} className="rounded bg-slate-100 px-1 py-0.5 text-xs">{p.slice(1,-1)}</code>;
    const link = /^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/.exec(p);
    if (link) { const href=safeHttps(link[2]); if(href) return <a key={i} className="font-medium !text-[var(--teal-deep)] underline" href={href} target="_blank" rel="noopener noreferrer">{link[1]}</a>; }
    return p;
  });
}
export function RichLessonText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g,"\n").split("\n");
  const nodes: ReactNode[]=[];
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    if (!line.trim()) { nodes.push(<div key={i} className="h-2"/>); continue; }
    const h=/^(#{1,3})\s+(.+)/.exec(line);
    if (h) {nodes.push(<h4 key={i} className={h[1].length===1?"mt-3 text-lg font-semibold text-[var(--text-primary)]":"mt-2 text-[15px] font-semibold text-[var(--text-primary)]"}>{inline(h[2])}</h4>); continue;}
    const bullet=/^\s*[-*]\s+(.+)/.exec(line), num=/^\s*\d+\.\s+(.+)/.exec(line);
    if (bullet || num) {
      const numbered=!!num, start=i, elements:ReactNode[]=[];
      let match:RegExpExecArray|null;
      const regex=numbered?/^\s*\d+\.\s+(.+)/:/^\s*[-*]\s+(.+)/;
      while(i<lines.length && (match=regex.exec(lines[i]))) {elements.push(<li key={i}>{inline(match[1])}</li>);i++;}
      i--;
      nodes.push(numbered?<ol key={start} className="ml-5 list-decimal space-y-1">{elements}</ol>:<ul key={start} className="ml-5 list-disc space-y-1">{elements}</ul>);continue;
    }
    nodes.push(<p key={i} className="whitespace-pre-wrap break-words">{inline(line)}</p>);
  }
  return <div className="space-y-1.5 text-[14px] leading-7 text-[var(--text-secondary)]">{nodes}</div>;
}
export default function LessonBody({ material, children }: { material: LessonMaterial; children?: ReactNode }) {
  const kind=material.lesson_kind as LessonKind;
  if(kind==="divider") return <hr className="my-3 border-[var(--border)]"/>;
  if(kind==="callout") return <aside className={`rounded-xl border-l-4 p-4 ${material.lesson_callout_style==="warning"?"border-amber-400 bg-amber-50":"border-[var(--teal)] bg-[var(--teal-soft)]"}`}><h4 className="mb-2 font-semibold text-[var(--text-primary)]">{material.title}</h4><RichLessonText text={material.description||""}/></aside>;
  return <section className="rounded-[14px] border border-[var(--border)] bg-white p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{LESSON_LABELS[kind]||kind}</span><span className="text-xs text-[var(--text-secondary)]">{material.lesson_duration_minutes ? `${material.lesson_duration_minutes} min · ` : ""}{material.lesson_tracking ? material.is_required ? "Required" : "Optional" : "Informational"}</span></div>
    <h4 className="text-lg font-semibold text-[var(--text-primary)]">{material.title}</h4>
    {material.description && <RichLessonText text={material.description}/>}
    {MEDIA_KINDS.includes(kind) && <LessonMedia key={`${material.id}:${material.url}:${material.lesson_asset_path}`} material={material}/>}
    {children}
  </section>;
}
