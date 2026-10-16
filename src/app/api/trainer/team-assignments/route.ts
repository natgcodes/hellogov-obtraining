import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorized() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;
  const { data: profile } = await client.from("profiles").select("role,account_status").eq("id",user.id).single();
  return profile?.role === "trainer" && profile.account_status === "active";
}
export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({error:"Forbidden"},{status:403});
  const { teamLeaderId, learnerId, assigned } = await request.json();
  if (typeof teamLeaderId !== "string" || typeof learnerId !== "string" || typeof assigned !== "boolean" || teamLeaderId === learnerId)
    return NextResponse.json({error:"Invalid assignment"},{status:400});
  const admin = createAdminClient();
  const {data: people,error: lookupError} = await admin.from("profiles").select("id,role,account_status").in("id",[teamLeaderId,learnerId]);
  if (lookupError || people?.length !== 2 || !people.some(p=>p.id===teamLeaderId && p.role==="team_leader" && p.account_status==="active") || !people.some(p=>p.id===learnerId && p.role==="learner" && p.account_status==="active"))
    return NextResponse.json({error:"Only active Trainees can be assigned to an active Team Leader."},{status:400});
  const client = await createClient();
  const {data:{user}} = await client.auth.getUser();
  const result = assigned
    ? await admin.from("team_leader_assignments").upsert({team_leader_id:teamLeaderId,learner_id:learnerId,assigned_by:user!.id})
    : await admin.from("team_leader_assignments").delete().eq("team_leader_id",teamLeaderId).eq("learner_id",learnerId);
  if (result.error) return NextResponse.json({error:result.error.message},{status:500});
  return NextResponse.json({success:true});
}
