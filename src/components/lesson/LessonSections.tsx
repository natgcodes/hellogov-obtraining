import LessonBody from "./LessonBody";
import LessonCompletion from "./LessonCompletion";
import { LessonResourceLink } from "./LessonMedia";
import { isContent, lessonOrder, referenceMaterials, type LessonMaterial } from "@/lib/lesson/content";
export function LessonContentSection({materials,progress,readOnly=false}:{materials:LessonMaterial[];progress:Record<string,boolean>;readOnly?:boolean}) {
  const blocks=materials.filter(isContent).sort(lessonOrder);
  if(!blocks.length)return null;
  return <section className="space-y-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Lesson content</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Review the content and complete each required section.</p></div>{blocks.map(block=><LessonBody key={block.id} material={block}><LessonCompletion material={block} completed={!!progress[block.id]} readOnly={readOnly}/></LessonBody>)}</section>;
}
export function LessonReferenceSection({materials,progress,readOnly=false}:{materials:LessonMaterial[];progress:Record<string,boolean>;readOnly?:boolean}) {
  const refs=referenceMaterials(materials), task=materials.find(m=>m.lesson_kind==="bookmarks");
  if(!refs.length&&!task)return null;
  return <section className="space-y-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] p-4"><h4 className="font-semibold text-[var(--text-primary)]">{task?.title||"Your learning resources"}</h4><p className="text-sm leading-6 text-[var(--text-secondary)]">{task?.description||"The resources below contain information covered in this lesson. Open each resource and save it in your browser's bookmarks for future reference."}</p>{refs.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"><div><p className="text-sm font-semibold">{m.title}</p><p className="text-xs text-[var(--text-muted)]">{m.lesson_kind==="reference"?"Reference resource":m.material_type}</p></div><LessonResourceLink material={m}/></div>)}{refs.length>0&&<div className="rounded-lg bg-white p-3 text-xs leading-6 text-[var(--text-secondary)]">Save each resource in your browser using Ctrl+D (Windows) or ⌘+D (Mac). No in-platform bookmarks are created.</div>}{task&&<LessonCompletion material={task} completed={!!progress[task.id]} readOnly={readOnly}/>}</section>;
}
