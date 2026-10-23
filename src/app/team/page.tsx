import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import TrainingLeaderboard from "@/components/trainer/TrainingLeaderboard";
import TeamLeaderFeedbackWorkspace from "@/components/trainer/TeamLeaderFeedbackWorkspace";

import { getTrainerLeaderboard } from "@/lib/trainer/getLeaderboard";

export default async function TeamDashboard() {
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

  // Only assigned Trainees can appear in the team view.
  const trainee = await getTrainerLeaderboard({
    role: "learner",
    learnerIds: ids,
    useAdmin: true,
  });

  // Include the Team Leader's own onboarding results.
  const own = await getTrainerLeaderboard({
    role: "team_leader",
    learnerIds: [user.id],
    useAdmin: true,
  });

  const learners = [
    ...trainee.learners,
    ...own.learners,
  ].sort(
    (a, b) =>
      (b.average ?? -1) - (a.average ?? -1) ||
      a.name.localeCompare(b.name)
  );

  let rank = 0;
  let previous: number | null = null;

  learners.forEach((learner, index) => {
    if (learner.average == null) {
      learner.rank = null;
      return;
    }

    if (
      previous == null ||
      Math.abs(previous - learner.average) > 0.00001
    ) {
      rank = index + 1;
    }

    learner.rank = rank;
    previous = learner.average;
  });

  const allTopics = learners.flatMap(
    (learner) => learner.topics
  );

  const topicMap = new Map<
    string,
    {
      sum: number;
      count: number;
    }
  >();

  for (const topic of allTopics) {
    const value = topicMap.get(topic.topic) ?? {
      sum: 0,
      count: 0,
    };

    value.sum += topic.average * topic.count;
    value.count += topic.count;

    topicMap.set(topic.topic, value);
  }

  const topics = [...topicMap].map(
    ([topic, value]) => ({
      topic,
      average: value.sum / value.count,
      count: value.count,
    })
  );

  const scored = learners.filter(
    (learner) => learner.average != null
  );

  const classAverage = scored.length
    ? scored.reduce(
        (total, learner) =>
          total + (learner.average ?? 0),
        0
      ) / scored.length
    : null;

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

      {/* TEAM LEADERBOARD */}

      <TrainingLeaderboard
        data={{
          learners,
          classAverage,
          topics,
          expectedCount:
            trainee.expectedCount ||
            own.expectedCount,
          warning:
            trainee.warning ||
            own.warning,
        }}
      />

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