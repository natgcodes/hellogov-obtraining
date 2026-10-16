import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TrainingLeaderboard from "@/components/trainer/TrainingLeaderboard";
import { getTrainerLeaderboard } from "@/lib/trainer/getLeaderboard";

export default async function TeamDashboard() {
  const client = await createClient();
  const {data:{user}} = await client.auth.getUser();
  if (!user) redirect("/login");
  const {data:profile} = await client.from("profiles").select("role,account_status,full_name").eq("id",user.id).single();
  if (profile?.role !== "team_leader" || profile.account_status !== "active") redirect("/learn");
  const admin = createAdminClient();
  const {data:assignments,error} = await admin.from("team_leader_assignments").select("learner_id").eq("team_leader_id",user.id);
  if (error) throw new Error("Could not load team assignments");
  const ids = [...new Set((assignments??[]).map(x=>x.learner_id))];
  // Only these assigned Trainees can appear in the team view.
  const trainee = await getTrainerLeaderboard({role:"learner",learnerIds:ids,useAdmin:true});
  const own = await getTrainerLeaderboard({role:"team_leader",learnerIds:[user.id],useAdmin:true});
  const learners = [...trainee.learners, ...own.learners].sort((a,b)=>(b.average??-1)-(a.average??-1)||a.name.localeCompare(b.name));
  let rank=0;let previous:number|null=null;
  learners.forEach((x,i)=>{if(x.average==null){x.rank=null;return;} if(previous==null||Math.abs(previous-x.average)>0.00001)rank=i+1;x.rank=rank;previous=x.average;});
  const allTopics = learners.flatMap(l=>l.topics);
  const topicMap = new Map<string,{sum:number,count:number}>();
  for(const t of allTopics){const v=topicMap.get(t.topic)??{sum:0,count:0};v.sum+=t.average*t.count;v.count+=t.count;topicMap.set(t.topic,v);}
  const topics=[...topicMap].map(([topic,v])=>({topic,average:v.sum/v.count,count:v.count}));
  const scored=learners.filter(l=>l.average!=null);
  const classAverage=scored.length?scored.reduce((a,l)=>a+(l.average??0),0)/scored.length:null;
  return <div className="mx-auto max-w-7xl px-6 py-8"><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">My Team · {profile.full_name}</h1><Link href="/learn" className="text-sm text-teal-700">Back to onboarding →</Link></div><p className="mt-3 text-sm text-slate-500">Only assigned Trainees and your own onboarding results appear here.</p><TrainingLeaderboard data={{learners,classAverage,topics,expectedCount:trainee.expectedCount||own.expectedCount,warning:trainee.warning||own.warning}} /></div>;
}
