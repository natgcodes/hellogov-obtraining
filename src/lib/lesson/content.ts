/** Lesson content is an opt-in extension of materials. Existing materials have no lesson_kind. */
export const LESSON_KINDS = ["reading", "presentation", "video", "image", "pdf", "interactive", "callout", "divider", "reference", "bookmarks"] as const;
export type LessonKind = typeof LESSON_KINDS[number];
export const LESSON_LABELS: Record<LessonKind, string> = {
  reading: "Reading", presentation: "Presentation", video: "Video", image: "Image / infographic", pdf: "PDF document", interactive: "Interactive demo", callout: "Callout", divider: "Divider", reference: "Reference link", bookmarks: "Browser bookmark task",
};
export type LessonFields = {
  lesson_kind?: string | null;
  lesson_order?: number | null;
  lesson_tracking?: boolean;
  lesson_reference?: boolean;
  lesson_asset_path?: string | null;
  lesson_duration_minutes?: number | null;
  lesson_alt?: string | null;
  lesson_callout_style?: string | null;
};
export type LessonMaterial = LessonFields & {
  id: string; title: string; description: string | null; material_type: string;
  url: string | null; is_required: boolean; position: number;
};
export const MEDIA_KINDS = ["presentation", "video", "image", "pdf", "interactive"];
export const isLesson = (m: LessonMaterial) => LESSON_KINDS.includes(m.lesson_kind as LessonKind);
export const isContent = (m: LessonMaterial) => isLesson(m) && m.lesson_kind !== "reference" && m.lesson_kind !== "bookmarks";
export const lessonOrder = (a: LessonMaterial, b: LessonMaterial) => (a.lesson_order ?? a.position) - (b.lesson_order ?? b.position) || a.id.localeCompare(b.id);
export function safeHttps(value?: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value.trim()); return url.protocol === "https:" && !url.username && !url.password && !url.port ? url.href : null; } catch { return null; }
}
const idPattern = /^[A-Za-z0-9_-]+$/;
export type Media = { src: string; mode: "frame" | "image" | "external"; provider: string };
/** Never load arbitrary iframe HTML or allow arbitrary iframe hosts. */
export function lessonMedia(kind: string | null | undefined, link?: string | null): Media | null {
  const href = safeHttps(link); if (!href) return null;
  const u = new URL(href), host = u.hostname.toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);
  if (kind === "presentation" && host === "docs.google.com" && parts[0] === "presentation" && parts[1] === "d") {
    const published = parts[2] === "e";
    const id = parts[published ? 3 : 2];
    if (id && idPattern.test(id)) return { src: `https://docs.google.com/presentation/d/${published ? "e/" : ""}${id}/${published ? "embed" : "preview"}`, mode: "frame", provider: "Google Slides" };
  }
  if (["video", "pdf", "image"].includes(kind ?? "") && host === "drive.google.com") {
    const fileIndex = parts.indexOf("d");
    const id = parts[0] === "file" && fileIndex >= 0 ? parts[fileIndex + 1] : u.searchParams.get("id");
    if (id && idPattern.test(id)) {
      const preview = new URL(`https://drive.google.com/file/d/${id}/preview`);
      const key = u.searchParams.get("resourcekey"); if (key && idPattern.test(key)) preview.searchParams.set("resourcekey", key);
      return { src: preview.href, mode: "frame", provider: "Google Drive" };
    }
  }
  if (kind === "video" && (host === "www.loom.com" || host === "loom.com") && ["share", "embed"].includes(parts[0])) {
    const id = parts[1]; if (id && idPattern.test(id)) return { src: `https://www.loom.com/embed/${id}`, mode: "frame", provider: "Loom" };
  }
  if (kind === "interactive" && host === "app.supademo.com" && ["demo", "embed"].includes(parts[0])) {
    const id = parts[1]; if (id && idPattern.test(id)) return { src: `https://app.supademo.com/embed/${id}`, mode: "frame", provider: "Supademo" };
  }
  if (kind === "pdf" && /\.pdf$/i.test(u.pathname)) return { src: href, mode: "frame", provider: "External PDF" };
  if (kind === "image") return { src: href, mode: "image", provider: "External image" };
  return { src: href, mode: "external", provider: "External resource" };
}
export function referenceMaterials(materials: LessonMaterial[]) {
  const seen = new Set<string>();
  for (const m of materials.filter(m => !isLesson(m))) { const url = safeHttps(m.url); if (url) seen.add(url); }
  return materials.filter(m => (m.lesson_kind === "reference" || m.lesson_reference) && isLesson(m)).sort(lessonOrder).filter(m => {
    const key = safeHttps(m.url) || m.lesson_asset_path;
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
