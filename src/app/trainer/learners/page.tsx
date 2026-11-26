import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { type ProgressSnapshot, type TrainingWave, withWave, statusLabel } from "@/lib/trainer/progressV2";

const roles = ["observer", "cross_training", "team_leader", "executive"];
const labels: Record<string,string> = {observer:"Observer",cross_training:"Cross-Training",team_leader:"Team Leader",executive:"Executive",learner:"Learner"};
const selectClass = "rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm";
export default async function TrainerLearnersPage({searchParams}: {searchParams: Promise<{wave?:string;tab?:string;role?:string;history?:string}>}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const {data:profile} = await supabase.from("profiles").select("full_name,email,role,account_status").eq("id",user.id).single();
  if (!profile || profile.role !== "trainer" || profile.account_status !== "active") redirect("/learn");
  const waveResult = await supabase.rpc("hg_get_training_waves_v2");
  if (waveResult.error) throw new Error("Unable to load training waves.");
  const waves = (waveResult.data ?? []) as TrainingWave[];
  const wave = waves.some(w => w.id === params.wave) ? params.wave! : "all";
  const other = params.tab === "other";
  const role = other && roles.includes(params.role ?? "") ? params.role! : "all";
  const history = params.history === "all";
  const {data,error} = await supabase.rpc("hg_get_trainee_progress_v2", {
    target_program_id: wave === "all" ? null : wave,
    target_role: other ? role === "all" ? null : role : "learner",
    include_historical: history || wave !== "all",
  });
  const rows = ((data ?? []) as ProgressSnapshot[]).filter(r => other ? r.role !== "learner" : r.role === "learner");
  const href = (tab:string) => `/trainer/learners?${new URLSearchParams({tab,wave,history:history?"all":"current"})}`;
  const avg = rows.length ? rows.reduce((a,r)=>a+Number(r.overall_progress),0)/rows.length : 0;
  return <AppShell role="trainer" userName={profile.full_name} userEmail={profile.email}>
    <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-7 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-[var(--teal)]">Training Operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Trainee Progress</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Track the complete onboarding, available content and assessment results across waves.</p></div><Link href="/trainer/review" className="rounded-lg bg-[#101828] px-4 py-3 text-xs font-semibold !text-white">Quiz Review</Link></header>
      <nav className="mt-6 flex gap-4 border-b border-[var(--border)]">{["learners","other"].map(tab=><Link key={tab} href={href(tab)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${(tab==="other")===other?"border-[#08A9C1] !text-[#07879B]":"border-transparent"}`}>{tab==="other"?"Other Roles":"Trainees"}</Link>)}</nav>
      <form className="my-5 flex flex-wrap items-end gap-3" action="/trainer/learners">
        <input type="hidden" name="tab" value={other?"other":"learners"}/>
        <label className="grid gap-1 text-xs font-medium">Wave<select name="wave" defaultValue={wave} className={selectClass}><option value="all">All Waves</option>{waves.map(w=><option key={w.id} value={w.id}>{w.title}{w.status!=="published"?` (${w.status})`:""}</option>)}</select></label>
        {other && <label className="grid gap-1 text-xs font-medium">Role<select name="role" defaultValue={role} className={selectClass}><option value="all">All Roles</option>{roles.map(r=><option key={r} value={r}>{labels[r]}</option>)}</select></label>}
        <label className="grid gap-1 text-xs font-medium">Enrollment<select name="history" defaultValue={history?"all":"current"} className={selectClass}><option value="current">Current assignments (All Waves)</option><option value="all">Include history</option></select></label><button className="rounded-lg bg-[#07879B] px-4 py-2 text-sm font-semibold text-white">Apply</button>
      </form>
      <p className="text-xs text-[var(--text-muted)]">A specific wave includes its historical enrollments. Training status and account status are independent.</p>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">Progress is temporarily unavailable. Please try again.</p> : <>
      <section className="my-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Enrollments",rows.length],["Average overall progress",`${avg.toFixed(1)}%`],["Training completed",rows.filter(r=>r.training_status==="completed").length],["Assessments needing review",rows.reduce((a,r)=>a+Number(r.pending_review_assessments),0)]].map(([label,value])=><div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-xs text-[var(--text-secondary)]">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}</section>
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[#F8FAFC] text-xs text-[var(--text-secondary)]"><tr>{["User","Wave","Overall / available","Modules","Assessments","Review","Training status","Actions"].map(t=><th key={t} className="px-4 py-3 font-semibold">{t}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border-soft)]">{rows.map(r=><tr key={`${r.program_id}:${r.learner_id}`} className="hover:bg-[#FAFCFC]"><td className="px-4 py-4"><p className="font-semibold">{r.full_name || r.email}</p><p className="text-xs text-[var(--text-muted)]">{r.email}</p><p className="mt-1 text-xs">{labels[r.role]??r.role} · {statusLabel(r.account_status)}</p></td><td className="px-4 py-4"><p>{r.wave_title}</p><p className="text-xs text-[var(--text-muted)]">{r.is_active_wave?"Current assignment":"Historical"}</p></td><td className="px-4 py-4"><p className="font-semibold">{Number(r.overall_progress).toFixed(1)}%</p><div className="my-1 h-1.5 w-28 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#08A9C1]" style={{width:`${r.overall_progress}%`}}/></div><p className="text-xs text-[var(--text-muted)]">{Number(r.available_progress).toFixed(1)}% available</p></td><td className="px-4 py-4">{r.completed_modules}/{r.total_modules}<p className="text-xs text-[var(--text-muted)]">Completed</p></td><td className="px-4 py-4">{r.submitted_assessments}/{r.total_assessments}<p className="text-xs text-[var(--text-muted)]">Submitted · {r.passed_assessments} passed</p></td><td className="px-4 py-4">{r.pending_review_assessments || "—"}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${r.training_status==="completed"?"bg-emerald-50 text-emerald-700":r.training_status==="in_progress"?"bg-cyan-50 text-cyan-800":"bg-slate-100 text-slate-600"}`}>{statusLabel(r.training_status)}</span></td><td className="space-y-2 px-4 py-4 text-xs font-semibold"><Link className="block !text-[#07879B]" href={withWave(`/trainer/learners/${r.learner_id}`,r.program_id)}>View details →</Link>{r.program_status==="published"&&<Link className="block !text-[#07879B]" href={withWave(`/trainer/impersonate/${r.learner_id}`,r.program_id)}>View as Learner</Link>}</td></tr>)}</tbody></table></div>{!rows.length&&<p className="p-8 text-center text-sm text-[var(--text-muted)]">No enrollments match these filters.</p>}</section></>}
    </main></AppShell>;
}
