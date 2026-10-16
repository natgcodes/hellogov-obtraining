import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TopicScore = { topic: string; average: number; count: number };
export type RankedLearner = {
  id: string;
  name: string;
  email: string;
  rank: number | null;
  average: number | null;
  gradedCount: number;
  expectedCount: number;
  complete: boolean;
  topics: TopicScore[];
  averageModuleMinutes: number | null;
  timedModuleCount: number;
};
export type LeaderboardData = {
  learners: RankedLearner[];
  classAverage: number | null;
  topics: TopicScore[];
  expectedCount: number;
  warning: string | null;
};

type Attempt = { learner_id: string; quiz_id: string; score: number | null; attempt_number: number; graded_at: string | null; id: string };

// Each quiz contributes at most once per learner: their latest graded attempt.
// In-progress/ungraded/cancelled attempts do not count as zero.
export async function getTrainerLeaderboard(
  options?: { role?: "learner" | "team_leader"; learnerIds?: string[]; useAdmin?: boolean }
): Promise<LeaderboardData> {
  const supabase = options?.useAdmin ? createAdminClient() : await createClient();
  const empty: LeaderboardData = { learners: [], classAverage: null, topics: [], expectedCount: 0, warning: null };
  const [profilesResult, enrollmentsResult, daysResult] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,account_status").eq("role", options?.role ?? "learner"),
    supabase.from("program_enrollments").select("learner_id").eq("program_id", HELLOGOV_PROGRAM_ID),
    supabase.from("days").select("id").eq("program_id", HELLOGOV_PROGRAM_ID),
  ]);
  if (profilesResult.error || enrollmentsResult.error || daysResult.error) {
    return { ...empty, warning: "Could not load learner or program information." };
  }
  const active = new Map((profilesResult.data ?? []).filter(p => p.account_status !== "deactivated").map(p => [p.id, p]));
  const learnerIds = [...new Set((enrollmentsResult.data ?? []).map(e => e.learner_id))].filter(id => active.has(id) && (!options?.learnerIds || options.learnerIds.includes(id)));
  const dayIds = (daysResult.data ?? []).map(d => d.id);
  if (!learnerIds.length) return empty;
  if (!dayIds.length) return { ...empty, warning: "No program days found." };

  const [modulesResult, checkpointsResult] = await Promise.all([
    supabase.from("modules").select("id,title").in("day_id", dayIds),
    supabase.from("checkpoints").select("quiz_id,title").in("day_id", dayIds),
  ]);
  if (modulesResult.error || checkpointsResult.error) return { ...empty, warning: "Could not load quiz topics." };
  const modules = modulesResult.data ?? [];
  const topicByQuiz = new Map<string, string>();
  if (modules.length) {
    const quizResult = await supabase.from("quizzes").select("id,module_id,title").in("module_id", modules.map(m => m.id));
    if (quizResult.error) return { ...empty, warning: "Could not load module quizzes." };
    const moduleNames = new Map(modules.map(m => [m.id, m.title]));
    for (const quiz of quizResult.data ?? []) {
      topicByQuiz.set(quiz.id, moduleNames.get(quiz.module_id) || quiz.title || "Other");
    }
  }
  for (const checkpoint of checkpointsResult.data ?? []) {
    if (checkpoint.quiz_id) topicByQuiz.set(checkpoint.quiz_id, checkpoint.title || "Checkpoint");
  }
  const quizIds = [...topicByQuiz.keys()];
  const expectedCount = quizIds.length;
  if (!expectedCount) return { ...empty, expectedCount: 0, warning: "No quizzes found for this program." };

  // Paginate instead of relying on Supabase's default 1,000-row cap.
  const attempts: Attempt[] = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await supabase.from("quiz_attempts")
      .select("id,learner_id,quiz_id,score,attempt_number,graded_at")
      .eq("status", "graded")
      .in("quiz_id", quizIds)
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) return { ...empty, warning: "Could not load graded quiz attempts." };
    attempts.push(...((data ?? []) as Attempt[]));
    if ((data ?? []).length < 1000) break;
    if (offset === 99000) return { ...empty, warning: "Too many attempts to calculate rankings safely." };
  }
  const latest = new Map<string, Attempt>();
  for (const attempt of attempts) {
    if (!active.has(attempt.learner_id) || !learnerIds.includes(attempt.learner_id) || attempt.score == null) continue;
    const key = `${attempt.learner_id}:${attempt.quiz_id}`;
    const previous = latest.get(key);
    if (!previous || attempt.attempt_number > previous.attempt_number ||
      (attempt.attempt_number === previous.attempt_number && (attempt.graded_at ?? "") > (previous.graded_at ?? ""))) {
      latest.set(key, attempt);
    }
  }
  const byLearner = new Map<string, Attempt[]>();
  for (const attempt of latest.values()) {
    const group = byLearner.get(attempt.learner_id) ?? [];
    group.push(attempt);
    byLearner.set(attempt.learner_id, group);
  }
  const summarize = (rows: { topic: string; score: number }[]): TopicScore[] => {
    const groups = new Map<string, number[]>();
    for (const row of rows) groups.set(row.topic, [...(groups.get(row.topic) ?? []), row.score]);
    return [...groups].map(([topic, scores]) => ({ topic, count: scores.length, average: scores.reduce((a, b) => a + b, 0) / scores.length }))
      .sort((a, b) => b.average - a.average || a.topic.localeCompare(b.topic));
  };
  // Elapsed module time, not active time. Exclude incomplete or invalid intervals.
  const timingByLearner = new Map<string, number[]>();
  const moduleIds = modules.map(m => m.id);
  if (moduleIds.length) {
    for (let offset = 0; offset < 100000; offset += 1000) {
      const { data: progress, error: progressError } = await supabase
        .from("learner_module_progress")
        .select("id,learner_id,module_id,status,started_at,completed_at")
        .in("module_id", moduleIds)
        .not("started_at", "is", null)
        .not("completed_at", "is", null)
        .order("id", { ascending: true })
        .range(offset, offset + 999);
      if (progressError) break; // Grades remain usable even if timing is unavailable.
      for (const row of progress ?? []) {
        if (!learnerIds.includes(row.learner_id) || row.status !== "completed") continue;
        const start = Date.parse(row.started_at);
        const end = Date.parse(row.completed_at);
        const minutes = (end - start) / 60000;
        if (!Number.isFinite(minutes) || minutes < 0) continue;
        const list = timingByLearner.get(row.learner_id) ?? [];
        list.push(minutes);
        timingByLearner.set(row.learner_id, list);
      }
      if ((progress ?? []).length < 1000) break;
    }
  }
  const learners: RankedLearner[] = learnerIds.map(id => {
    const profile = active.get(id)!;
    const graded = byLearner.get(id) ?? [];
    const scores = graded.map(a => Number(a.score));
    const moduleTimes = timingByLearner.get(id) ?? [];
    return {
      id, name: profile.full_name || profile.email || "Learner", email: profile.email || "",
      rank: null, average: scores.length ? scores.reduce((a,b) => a+b,0) / scores.length : null,
      gradedCount: scores.length, expectedCount, complete: scores.length === expectedCount,
      topics: summarize(graded.map(a => ({ topic: topicByQuiz.get(a.quiz_id) || "Other", score: Number(a.score) }))),
      averageModuleMinutes: moduleTimes.length ? moduleTimes.reduce((a,b) => a+b,0) / moduleTimes.length : null,
      timedModuleCount: moduleTimes.length,
    } satisfies RankedLearner;
  });
  learners.sort((a,b) => (b.average ?? -1) - (a.average ?? -1) || a.name.localeCompare(b.name));
  let rank = 0;
  let lastScore: number | null = null;
  learners.forEach((learner, index) => {
    if (learner.average == null) return;
    if (lastScore === null || Math.abs(lastScore - learner.average) > 0.00001) rank = index + 1;
    learner.rank = rank;
    lastScore = learner.average;
  });
  const allScores = [...latest.values()].filter(a => learnerIds.includes(a.learner_id)).map(a => Number(a.score));
  const classAverage = allScores.length ? allScores.reduce((a,b) => a+b,0) / allScores.length : null;
  const topics = summarize([...latest.values()].filter(a => learnerIds.includes(a.learner_id)).map(a => ({ topic: topicByQuiz.get(a.quiz_id) || "Other", score: Number(a.score) })));
  return { learners, classAverage, topics, expectedCount, warning: null };
}
