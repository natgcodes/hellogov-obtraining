import { HELLOGOV_PROGRAM_ID } from "@/lib/program/constants";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TopicSubmission = {
  attemptId: string;
  learnerId: string;
  learnerName: string;
  score: number;
};

export type TopicScore = {
  submissions?: TopicSubmission[];
  topic: string;
  average: number;
  count: number;
  quizId?: string;
  quizTitle?: string;
  moduleId?: string | null;
  dayId?: string;
  programId?: string;
  programTitle?: string;
  assessmentType?: "Quiz" | "Checkpoint";
};

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
  enrollmentKey?: string;
  programId?: string;
  programTitle?: string;
};

export type LeaderboardData = {
  learners: RankedLearner[];
  classAverage: number | null;
  topics: TopicScore[];
  expectedCount: number;
  warning: string | null;
  programCount?: number;
};

type Attempt = {
  learner_id: string;
  quiz_id: string;
  score: number | null;
  attempt_number: number;
  graded_at: string | null;
  id: string;
};

type QuizTopic = {
  topic: string;
  quizId: string;
  quizTitle: string;
  moduleId: string | null;
  dayId: string;
  programId: string;
  programTitle: string;
  assessmentType: "Quiz" | "Checkpoint";
};

type LeaderboardOptions = {
  role?: "learner" | "team_leader";
  learnerIds?: string[];
  useAdmin?: boolean;
  programId?: string;
  programTitle?: string;
};

function emptyLeaderboard(
  warning: string | null = null
): LeaderboardData {
  return {
    learners: [],
    classAverage: null,
    topics: [],
    expectedCount: 0,
    warning,
  };
}

function mean(values: number[]): number | null {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}

export function rankLearners(
  learners: RankedLearner[]
): RankedLearner[] {
  const ranked = learners
    .map((learner) => ({
      ...learner,
      rank: null as number | null,
    }))
    .sort(
      (a, b) =>
        (b.average ?? -1) - (a.average ?? -1) ||
        a.name.localeCompare(b.name)
    );

  let rank = 0;
  let previous: number | null = null;

  ranked.forEach((learner, index) => {
    if (learner.average == null) return;

    if (
      previous === null ||
      Math.abs(previous - learner.average) > 0.00001
    ) {
      rank = index + 1;
    }

    learner.rank = rank;
    previous = learner.average;
  });

  return ranked;
}

export function mergeTopicScores(
  topics: TopicScore[]
): TopicScore[] {
  const groups = new Map<
    string,
    {
      metadata: TopicScore;
      sum: number;
      count: number;
      submissions: Map<string, TopicSubmission>;
    }
  >();

  for (const topic of topics) {
    if (!topic.count) continue;

    const key = topic.quizId
      ? `${topic.programId}:${topic.quizId}`
      : topic.topic;

    const current = groups.get(key) ?? {
      metadata: topic,
      sum: 0,
      count: 0,
      submissions: new Map<string, TopicSubmission>(),
    };

    current.sum += topic.average * topic.count;
    current.count += topic.count;

    for (const submission of topic.submissions ?? []) {
      current.submissions.set(submission.attemptId, submission);
    }
    groups.set(key, current);
  }

  return [...groups.values()]
    .map(({ metadata, sum, count, submissions }) => ({
      ...metadata,
      average: sum / count,
      count,
      ...(submissions.size
        ? { submissions: [...submissions.values()].sort(
            (a, b) => a.score - b.score ||
              a.learnerName.localeCompare(b.learnerName) ||
              a.attemptId.localeCompare(b.attemptId)
          ) }
        : {}),
    }))
    .sort(
      (a, b) =>
        b.average - a.average ||
        a.topic.localeCompare(b.topic)
    );
}

export function combineLeaderboards(
  datasets: LeaderboardData[]
): LeaderboardData {
  const learners = rankLearners(
    datasets.flatMap((dataset) => dataset.learners)
  );

  const topics = mergeTopicScores(
    datasets.flatMap((dataset) => dataset.topics)
  );

  const gradedCount = learners.reduce(
    (total, learner) =>
      total + learner.gradedCount,
    0
  );

  const scoreSum = learners.reduce(
    (total, learner) =>
      total +
      (learner.average ?? 0) *
        learner.gradedCount,
    0
  );

  const warnings = [
    ...new Set(
      datasets
        .map((dataset) => dataset.warning)
        .filter(Boolean)
    ),
  ];

  return {
    learners,
    topics,
    classAverage:
      gradedCount > 0
        ? scoreSum / gradedCount
        : null,
    expectedCount: datasets.reduce(
      (total, dataset) =>
        total + dataset.expectedCount,
      0
    ),
    programCount: datasets.length,
    warning: warnings.length
      ? warnings.join(" ")
      : null,
  };
}

// Each quiz contributes at most once per learner:
// their latest graded attempt.
export async function getTrainerLeaderboard(
  options?: LeaderboardOptions
): Promise<LeaderboardData> {
  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createClient();

  // Preserve existing behavior for other dashboards.
  const programId =
    options?.programId ?? HELLOGOV_PROGRAM_ID;

  const programTitle =
    options?.programTitle ?? "";

  const waveAware = Boolean(options?.programId);

  const empty = emptyLeaderboard();

  if (
    options?.learnerIds &&
    options.learnerIds.length === 0
  ) {
    return empty;
  }

  let profilesQuery = supabase.from("profiles")
    .select("id,full_name,email,account_status")
    .eq("role", options?.role ?? "learner");
  let enrollmentsQuery = supabase.from("program_enrollments")
    .select("learner_id").eq("program_id", programId);
  if (options?.learnerIds) {
    profilesQuery = profilesQuery.in("id", options.learnerIds);
    enrollmentsQuery = enrollmentsQuery.in("learner_id", options.learnerIds);
  }
  const [profilesResult, enrollmentsResult, daysResult] = await Promise.all([
    profilesQuery,
    enrollmentsQuery,
    supabase.from("days").select("id").eq("program_id", programId),
  ]);

  if (
    profilesResult.error ||
    enrollmentsResult.error ||
    daysResult.error
  ) {
    return emptyLeaderboard(
      "Could not load learner or program information."
    );
  }

  const active = new Map(
    (profilesResult.data ?? [])
      .filter(
        (p) =>
          p.account_status !== "deactivated"
      )
      .map((p) => [p.id, p])
  );

  const allowedIds = options?.learnerIds
    ? new Set(options.learnerIds)
    : null;

  const learnerIds = [
    ...new Set(
      (enrollmentsResult.data ?? []).map(
        (e) => e.learner_id
      )
    ),
  ].filter(
    (id) =>
      active.has(id) &&
      (!allowedIds || allowedIds.has(id))
  );

  const learnerIdSet = new Set(learnerIds);

  const dayIds = (daysResult.data ?? []).map(
    (d) => d.id
  );

  if (!learnerIds.length && !waveAware) {
    return empty;
  }

  if (!dayIds.length) {
    return learnerIds.length
      ? emptyLeaderboard(
          "No program days found."
        )
      : empty;
  }

  const [
    modulesResult,
    checkpointsResult,
  ] = await Promise.all([
    supabase
      .from("modules")
      .select("id,title,day_id")
      .in("day_id", dayIds),

    supabase
      .from("checkpoints")
      .select("quiz_id,title,day_id")
      .in("day_id", dayIds),
  ]);

  if (
    modulesResult.error ||
    checkpointsResult.error
  ) {
    return emptyLeaderboard(
      "Could not load quiz topics."
    );
  }

  const modules = modulesResult.data ?? [];

  const moduleMap = new Map(
    modules.map((module) => [
      module.id,
      module,
    ])
  );

  const topicByQuiz = new Map<
    string,
    QuizTopic
  >();

  // Regular quizzes.
  if (modules.length) {
    const quizResult = await supabase
      .from("quizzes")
      .select("id,module_id,title")
      .in(
        "module_id",
        modules.map((m) => m.id)
      );

    if (quizResult.error) {
      return emptyLeaderboard(
        "Could not load module quizzes."
      );
    }

    for (const quiz of quizResult.data ?? []) {
      const module = moduleMap.get(
        quiz.module_id
      );

      if (!module) continue;

      topicByQuiz.set(quiz.id, {
        topic:
          module.title ||
          quiz.title ||
          "Other",
        quizId: quiz.id,
        quizTitle:
          quiz.title || "Quiz",
        moduleId: module.id,
        dayId: module.day_id,
        programId,
        programTitle,
        assessmentType: "Quiz",
      });
    }
  }

  // Checkpoint quizzes.
  const checkpoints = (
    checkpointsResult.data ?? []
  ).filter(
    (checkpoint) => checkpoint.quiz_id
  );

  const checkpointQuizIds = [
    ...new Set(
      checkpoints.map(
        (checkpoint) => checkpoint.quiz_id
      )
    ),
  ];

  const checkpointQuizTitles = new Map<
    string,
    string
  >();

  if (checkpointQuizIds.length) {
    const { data, error } = await supabase
      .from("quizzes")
      .select("id,title")
      .in("id", checkpointQuizIds);

    if (error) {
      return emptyLeaderboard(
        "Could not load checkpoint quizzes."
      );
    }

    for (const quiz of data ?? []) {
      checkpointQuizTitles.set(
        quiz.id,
        quiz.title
      );
    }
  }

  for (const checkpoint of checkpoints) {
    topicByQuiz.set(
      checkpoint.quiz_id,
      {
        topic:
          checkpoint.title ||
          "Checkpoint",
        quizId: checkpoint.quiz_id,
        quizTitle:
          checkpointQuizTitles.get(
            checkpoint.quiz_id
          ) ||
          checkpoint.title ||
          "Checkpoint",
        moduleId: null,
        dayId: checkpoint.day_id,
        programId,
        programTitle,
        assessmentType: "Checkpoint",
      }
    );
  }

  const quizIds = [
    ...topicByQuiz.keys(),
  ];

  const expectedCount = quizIds.length;

  if (!expectedCount && !waveAware) {
    return emptyLeaderboard(
      "No quizzes found for this program."
    );
  }

  // Paginate graded attempts.
  const attempts: Attempt[] = [];

  if (
    quizIds.length &&
    learnerIds.length
  ) {
    for (
      let offset = 0;
      offset < 100000;
      offset += 1000
    ) {
      const { data, error } =
        await supabase
          .from("quiz_attempts")
          .select(
            "id,learner_id,quiz_id,score,attempt_number,graded_at"
          )
          .eq("status", "graded")
          .in("quiz_id", quizIds)
          .in("learner_id", learnerIds)
          .order("id", {
            ascending: true,
          })
          .range(
            offset,
            offset + 999
          );

      if (error) {
        return emptyLeaderboard(
          "Could not load graded quiz attempts."
        );
      }

      attempts.push(
        ...((data ?? []) as Attempt[])
      );

      if ((data ?? []).length < 1000) {
        break;
      }

      if (offset === 99000) {
        return emptyLeaderboard(
          "Too many attempts to calculate rankings safely."
        );
      }
    }
  }

  // Latest graded attempt per learner and quiz.
  const latest = new Map<
    string,
    Attempt
  >();

  for (const attempt of attempts) {
    if (
      !learnerIdSet.has(
        attempt.learner_id
      ) ||
      attempt.score == null
    ) {
      continue;
    }

    const key =
      `${attempt.learner_id}:${attempt.quiz_id}`;

    const previous = latest.get(key);

    if (
      !previous ||
      attempt.attempt_number >
        previous.attempt_number ||
      (
        attempt.attempt_number ===
          previous.attempt_number &&
        (attempt.graded_at ?? "") >
          (previous.graded_at ?? "")
      )
    ) {
      latest.set(key, attempt);
    }
  }

  const byLearner = new Map<
    string,
    Attempt[]
  >();

  for (const attempt of latest.values()) {
    const group =
      byLearner.get(
        attempt.learner_id
      ) ?? [];

    group.push(attempt);

    byLearner.set(
      attempt.learner_id,
      group
    );
  }

  function summarize(
    rows: Attempt[]
  ): TopicScore[] {
    const scores: TopicScore[] = [];

    for (const row of rows) {
      const metadata = topicByQuiz.get(
        row.quiz_id
      );

      if (
        !metadata ||
        row.score == null
      ) {
        continue;
      }

      scores.push(
        waveAware
          ? {
              ...metadata,
              average: Number(row.score),
              count: 1,
              ...(!options?.useAdmin
                ? { submissions: [{
                    attemptId: row.id,
                    learnerId: row.learner_id,
                    learnerName:
                      active.get(row.learner_id)?.full_name ||
                      active.get(row.learner_id)?.email ||
                      "Learner",
                    score: Number(row.score),
                  }] }
                : {}),
            }
          : {
              topic: metadata.topic,
              average: Number(row.score),
              count: 1,
            }
      );
    }

    return mergeTopicScores(scores);
  }

  // Elapsed module time.
  const timingByLearner = new Map<
    string,
    number[]
  >();

  const moduleIds = modules.map(
    (module) => module.id
  );

  let timingWarning: string | null = null;

  if (
    moduleIds.length &&
    learnerIds.length
  ) {
    for (
      let offset = 0;
      offset < 100000;
      offset += 1000
    ) {
      const {
        data: progress,
        error: progressError,
      } = await supabase
        .from("learner_module_progress")
        .select(
          "id,learner_id,module_id,status,started_at,completed_at"
        )
        .in("module_id", moduleIds)
        .in("learner_id", learnerIds)
        .not("started_at", "is", null)
        .not("completed_at", "is", null)
        .order("id", {
          ascending: true,
        })
        .range(
          offset,
          offset + 999
        );

      if (progressError) {
        timingWarning =
          "Module timing data is unavailable.";
        timingByLearner.clear();
        break;
      }

      for (const row of progress ?? []) {
        if (
          !learnerIdSet.has(
            row.learner_id
          ) ||
          row.status !== "completed"
        ) {
          continue;
        }

        const start = Date.parse(
          row.started_at
        );

        const end = Date.parse(
          row.completed_at
        );

        const minutes =
          (end - start) / 60000;

        if (
          !Number.isFinite(minutes) ||
          minutes < 0
        ) {
          continue;
        }

        const list =
          timingByLearner.get(
            row.learner_id
          ) ?? [];

        list.push(minutes);

        timingByLearner.set(
          row.learner_id,
          list
        );
      }

      if (
        (progress ?? []).length < 1000
      ) {
        break;
      }

      if (offset === 99000) {
        timingWarning =
          "Too many module records to calculate timing safely.";
        timingByLearner.clear();
      }
    }
  }

  const learners: RankedLearner[] =
    learnerIds.map((id) => {
      const profile = active.get(id)!;

      const graded =
        byLearner.get(id) ?? [];

      const scores = graded.map(
        (attempt) =>
          Number(attempt.score)
      );

      const moduleTimes =
        timingByLearner.get(id) ?? [];

      return {
        id,
        name:
          profile.full_name ||
          profile.email ||
          "Learner",
        email: profile.email || "",
        rank: null,
        average: mean(scores),
        gradedCount: scores.length,
        expectedCount,
        complete:
          expectedCount > 0 &&
          scores.length ===
            expectedCount,
        topics: summarize(graded),
        averageModuleMinutes:
          mean(moduleTimes),
        timedModuleCount:
          moduleTimes.length,

        ...(waveAware
          ? {
              enrollmentKey:
                `${programId}:${id}`,
              programId,
              programTitle,
            }
          : {}),
      };
    });

  const allAttempts = [
    ...latest.values(),
  ];

  const allScores = allAttempts.map(
    (attempt) =>
      Number(attempt.score)
  );

  return {
    learners: rankLearners(learners),
    classAverage: mean(allScores),
    topics: summarize(allAttempts),
    expectedCount,
    warning: timingWarning,
    ...(waveAware
      ? { programCount: 1 }
      : {}),
  };
}
