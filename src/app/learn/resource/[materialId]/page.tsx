import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonMedia from "@/components/lesson/LessonMedia";
import type { LessonMaterial } from "@/lib/lesson/content";
export default async function ResourcePage({params}:{params:Promise<{materialId:string}>}) {
  const {materialId}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  // Existing materials RLS restricts reads to authorized waves. Storage policy separately checks file access.
  const {data,error}=await supabase.from("materials").select("id,title,description,material_type,url,is_required,position,lesson_kind,lesson_asset_path,lesson_alt").eq("id",materialId).maybeSingle();
  if(error||!data?.lesson_asset_path||!["image","pdf"].includes(data.lesson_kind)) notFound();
  return <main className="mx-auto max-w-5xl space-y-4 p-6"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--teal-deep)]">HelloGov · Learning resource</p><h1 className="text-2xl font-semibold">{data.title}</h1><p className="text-sm text-[var(--text-secondary)]">Bookmark this page in your browser. Access requires your HelloGov account.</p><LessonMedia material={data as LessonMaterial} standalone/></main>;
}
