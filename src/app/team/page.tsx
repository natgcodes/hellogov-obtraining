import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import TrainingLeaderboard from "@/components/trainer/TrainingLeaderboard";
import TeamLeaderFeedbackWorkspace from "@/components/trainer/TeamLeaderFeedbackWorkspace";

import { getTrainerLeaderboard, combineLeaderboards } from "@/lib/trainer/getLeaderboard";

import DashboardWaveSelector from "@/components/trainer/DashboardWaveSelector";
import { getLearnerJourney } from "@/lib/learning/getLearnerJourney";

export default async function TeamDashboard({ searchParams }: { searchParams: Promise<{ programId?: string }> }) {
  const client = await createClient();

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await client
    .from("profiles")
    .select("role, account_status, full_name")
    .eq("id", user.id)
    .single();

  if (
    profile?.role !== "team_leader" ||
    profile.account_status !== "active"
  ) {
    redirect("/learn");
  }

  const admin = createAdminClient();

  const { data: assignments, error } = await admin
    .from("team_leader_assignments")
    .select("learner_id")
    .eq("team_leader_id", user.id);

  if (error) {
    throw new Error("Could not load team assignments");
  }

  const ids = [
    ...new Set(
      (assignments ?? []).map(
        (assignment) => assignment.learner_id
      )
    ),
  ];

  // Resolve available waves exclusively from assigned trainees and the TL.
  const { data: enrollments, error: enrollmentError } = await admin
    .from("program_enrollments").select("program_id")
    .in("learner_id", [...new Set([...ids, user.id])]);
  if (enrollmentError) throw new Error("Could not load team waves");
  const programIds = [...new Set((enrollments ?? []).map(e => e.program_id))];
  const programResult = programIds.length ? await admin.from("programs")
    .select("id,title").in("id", programIds).order("created_at", { ascending: false }).order("id") : { data: [], error: null };
  if (programResult.error) throw new Error("Could not load team programs");
  const programs = programResult.data ?? [];
  const params = await searchParams;
  const selectedProgram = programs.find(p => p.id === params.programId);
  const selected = selectedProgram?.id ?? "all";
  const selectedPrograms = selectedProgram ? [selectedProgram] : programs;
  const datasets = await Promise.all(selectedPrograms.map(async program => {
    const common = { programId: program.id, programTitle: program.title, useAdmin: true };
    const [trainee, own] = await Promise.all([
      getTrainerLeaderboard({ ...common, role: "learner", learnerIds: ids }),
      getTrainerLeaderboard({ ...common, role: "team_leader", learnerIds: [user.id] }),
    ]);
    // Both roles share the same assessment catalog; count it only once.
    return { ...combineLeaderboards([trainee, own]), expectedCount: Math.max(trainee.expectedCount, own.expectedCount), programCount: 1 };
  }));
  const leaderboard = combineLeaderboards(datasets);
  // Only link to learning days available in the TL's own authenticated journey.
  // Never expose trainer answer keys or switch the TL's active program.
  const journey = await getLearnerJourney(user.id);
  const accessibleDayIds = (journey?.days ?? []).filter(day => day.unlocked || day.completed).map(day => day.id);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          My Team · {profile.full_name}
        </h1>

        <Link
          href="/learn"
          className="text-sm text-teal-700"
        >
          Back to onboarding →
        </Link>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        Only assigned Trainees and your own onboarding
        results appear here.
      </p>

      <DashboardWaveSelector programs={programs} selected={selected} action="/team" />
      <TrainingLeaderboard key={selected} data={leaderboard} contentMode="team" accessibleDayIds={accessibleDayIds} />

      {/* TRAINER FEEDBACK */}

      <section className="mt-10 border-t border-[var(--border)] pt-8">
        <TeamLeaderFeedbackWorkspace
          currentUserId={user.id}
          role="team_leader"
        />
      </section>
    </div>
  );
}