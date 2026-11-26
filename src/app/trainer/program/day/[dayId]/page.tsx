import { notFound, redirect } from "next/navigation";
import DayEditor from "@/components/trainer/DayEditor";
import { getDays } from "@/lib/program/getDays";
import { createClient } from "@/lib/supabase/server";
export default async function TrainerDayEditorPage({params}:{params:Promise<{dayId:string}>}) {
 const {dayId}=await params; const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,account_status").eq("id",user.id).maybeSingle();
 if(profile?.role!=="trainer"||profile.account_status!=="active")redirect("/learn");
 const {data:day,error}=await supabase.from("days").select("program_id").eq("id",dayId).maybeSingle();
 if(error||!day)notFound();
 const [content]=await getDays(day.program_id,dayId);if(!content)notFound();
 return <DayEditor day={content} dayNumber={content.day_number} title={content.title} description={content.description||""} programId={day.program_id}/>;
}
