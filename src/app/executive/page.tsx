import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import TrainingLeaderboard from "@/components/trainer/TrainingLeaderboard";

import { getTrainerLeaderboard, combineLeaderboards } from "@/lib/trainer/getLeaderboard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrainingWave } from "@/lib/trainer/progressV2";
import { createClient } from "@/lib/supabase/server";

type ExecutiveMetrics = {
  total_trainees: number;
  in_progress: number;
  average_progress: number;
  completed: number;
  needs_review: number;
};

export default async function ExecutivePage({searchParams}: {searchParams: Promise<{wave?:string}>}) {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,role,account_status")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    profile.role !== "executive" ||
    profile.account_status !== "active"
  ) {
    redirect("/learn");
  }

  // ---------------------------------------------------------
  // EXECUTIVE DASHBOARD METRICS
  // ---------------------------------------------------------

  const waveResult = await supabase.rpc("hg_get_executive_waves_v2");
  if (waveResult.error) throw new Error("Unable to load executive waves.");
  const waves = (waveResult.data ?? []) as TrainingWave[];
  const awaitedWave = (await searchParams).wave;
  const selected = waves.find(w=>w.id === (awaitedWave));
  const selectedPrograms = selected ? [selected] : waves;
  const { data: metricsData, error: metricsError } =
    await supabase
      .rpc("get_executive_dashboard_metrics", {
        target_program_id: selected?.id ?? null,
      })
      .single();

  if (metricsError) {
    throw new Error("Unable to load Executive dashboard metrics.");
  }

  const dashboardMetrics =
    metricsData as ExecutiveMetrics | null;

  // ---------------------------------------------------------
  // AGENT LEADERBOARD
  //
  // Admin client is used only after server-side
  // Executive authorization.
  // ---------------------------------------------------------

  const admin = createAdminClient();
  const {data: assignments,error: assignmentError} = selected ? {data:[],error:null} : await admin.from("profiles").select("id,active_program_id").eq("role","learner");
  if (assignmentError) throw new Error("Unable to load current wave assignments.");
  const leaderboard = combineLeaderboards(await Promise.all(selectedPrograms.map(w=>getTrainerLeaderboard({role:"learner",useAdmin:true,programId:w.id,programTitle:w.title,...(!selected?{learnerIds:(assignments??[]).filter(a=>a.active_program_id===w.id).map(a=>a.id)}:{})}))));

  // ---------------------------------------------------------
  // METRIC CARDS
  // ---------------------------------------------------------

  const metrics = [
    {
      label: "Trainees",
      value: dashboardMetrics?.total_trainees ?? 0,
      helper: `${
        dashboardMetrics?.in_progress ?? 0
      } currently in progress`,
    },
    {
      label: "Average progress",
      value: `${Number(
        dashboardMetrics?.average_progress ?? 0
      ).toFixed(0)}%`,
      helper: "Across full onboarding content",
    },
    {
      label: "Completed",
      value: dashboardMetrics?.completed ?? 0,
      helper: "Onboarding completions",
    },
    {
      label: "Needs review",
      value: dashboardMetrics?.needs_review ?? 0,
      helper: "Assessments awaiting action",
    },
  ];

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <AppShell
      role="executive"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">
          {/* HEADER */}

          <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
                Training Operations
              </p>

              <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
                Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
                Monitor onboarding progress,
                pending reviews and trainee
                activity from one place.
              </p>
            </div>
          </section>

          <form action="/executive" className="mt-5 flex items-end gap-3"><label className="grid gap-1 text-xs font-medium">Training wave<select name="wave" defaultValue={selected?.id??"all"} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"><option value="all">All Waves — current assignments</option>{waves.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select></label><button className="rounded-lg bg-[#07879B] px-4 py-2 text-sm font-semibold text-white">Apply</button></form>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{selected?"Includes historical enrollments in this wave.":"Current assignments only; no duplicate historical users."}</p>
          {/* METRICS */}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[18px] border border-[var(--border)] bg-white px-5 py-5 shadow-[var(--shadow-xs)]"
              >
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                  {metric.label}
                </p>

                <p className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {metric.value}
                </p>

                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {metric.helper}
                </p>
              </div>
            ))}
          </section>

          {/* AGENT LEADERBOARD */}

          <TrainingLeaderboard data={leaderboard} />
        </main>
      </div>
    </AppShell>
  );
}