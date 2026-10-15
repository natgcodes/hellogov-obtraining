import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import ReviewCenterDashboard, {
  type ReviewRecord,
} from "@/components/trainer/ReviewCenterDashboard";

import { createClient } from "@/lib/supabase/server";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";

import type { ReviewQueueItem } from "@/lib/trainer/types";

type QuizInfo = {
  id: string;
  title: string;
  max_attempts: number | null;
};

type LearnerInfo = {
  full_name: string | null;
  email: string | null;
};

type HistoryItem = {
  id: string;
  quiz_id: string;
  attempt_number: number;
  score: number | null;
  passed: boolean | null;
  status: string;
  submitted_at: string | null;
  graded_at: string | null;
  grading_method: "manual" | "automatic" | null;
  reviewed_by: string | null;
  quizzes: QuizInfo | QuizInfo[] | null;
  profiles: LearnerInfo | LearnerInfo[] | null;
};

export default async function ReviewCenterPage() {
  const supabase = await createClient();

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "trainer") {
    redirect("/learn");
  }

  const program = await getTrainerProgram();

  if (!program) {
    return (
      <AppShell role="trainer">
        No program found.
      </AppShell>
    );
  }

  // ============================================================
  // FETCH PROGRAM MODULES, CHECKPOINTS AND REVIEW QUEUE
  // ============================================================

  const [
    { data: programModules, error: modulesError },
    { data: programCheckpoints, error: checkpointsError },
    { data: pending, error: queueError },
  ] = await Promise.all([
    supabase
      .from("modules")
      .select(
        `
        id,
        day_id,
        days!inner(
          id,
          day_number,
          program_id
        )
        `
      )
      .eq("days.program_id", program.id),

    supabase
      .from("checkpoints")
      .select(
        `
        id,
        quiz_id,
        day_id,
        days!inner(
          id,
          day_number,
          program_id
        )
        `
      )
      .eq("days.program_id", program.id),

    supabase.rpc("get_quiz_review_queue", {
      target_program_id: program.id,
    }),
  ]);

  // ============================================================
  // BUILD MODULE DAY MAP
  // ============================================================

  const moduleDayMap = new Map<string, number>();

  for (const module of programModules ?? []) {
    const day = Array.isArray(module.days)
      ? module.days[0]
      : module.days;

    if (day?.day_number != null) {
      moduleDayMap.set(module.id, day.day_number);
    }
  }

  const moduleIds = (programModules ?? []).map(
    (module) => module.id
  );

  // ============================================================
  // BUILD CHECKPOINT QUIZ DAY MAP
  // ============================================================

  const checkpointQuizDayMap = new Map<string, number>();

  const checkpointQuizIds = new Set<string>();

  for (const checkpoint of programCheckpoints ?? []) {
    if (!checkpoint.quiz_id) continue;

    checkpointQuizIds.add(checkpoint.quiz_id);

    const day = Array.isArray(checkpoint.days)
      ? checkpoint.days[0]
      : checkpoint.days;

    if (day?.day_number != null) {
      checkpointQuizDayMap.set(
        checkpoint.quiz_id,
        day.day_number
      );
    }
  }

  // ============================================================
  // FETCH MODULE QUIZZES AND BUILD QUIZ DAY MAP
  // ============================================================

  const quizDayMap = new Map<string, number>();

  let moduleQuizIds: string[] = [];
  let quizzesErrorMessage: string | null = null;

  if (moduleIds.length > 0) {
    const { data, error } = await supabase
      .from("quizzes")
      .select("id,module_id")
      .in("module_id", moduleIds);

    if (error) {
      quizzesErrorMessage = error.message;
    } else {
      moduleQuizIds = (data ?? []).map((quiz) => quiz.id);

      for (const quiz of data ?? []) {
        if (!quiz.module_id) continue;

        const dayNumber = moduleDayMap.get(quiz.module_id);

        if (dayNumber != null) {
          quizDayMap.set(quiz.id, dayNumber);
        }
      }
    }
  }

  // ============================================================
  // ADD CHECKPOINT QUIZZES TO DAY MAP
  // ============================================================

  for (const [quizId, dayNumber] of checkpointQuizDayMap) {
    quizDayMap.set(quizId, dayNumber);
  }

  // ============================================================
  // COMBINE MODULE QUIZZES AND CHECKPOINT QUIZZES
  // ============================================================

  const programQuizIds = [
    ...new Set([...moduleQuizIds, ...checkpointQuizIds]),
  ];

  // ============================================================
  // FETCH REVIEW HISTORY
  // ============================================================

  let history: HistoryItem[] = [];
  let historyErrorMessage: string | null = null;

  if (programQuizIds.length > 0) {
    const { data, error } = await supabase
      .from("quiz_attempts")
      .select(
        `
        id,
        quiz_id,
        attempt_number,
        score,
        passed,
        status,
        submitted_at,
        graded_at,
        grading_method,
        reviewed_by,
        quizzes(
          id,
          title,
          max_attempts
        ),
        profiles!quiz_attempts_learner_id_fkey(
          full_name,
          email
        )
        `
      )
      .in("status", ["graded", "cancelled"])
      .in("quiz_id", programQuizIds)
      .order("graded_at", { ascending: false })
      .limit(500);

    if (error) {
      historyErrorMessage = error.message;
    } else {
      history = (data ?? []) as HistoryItem[];
    }
  }

  // ============================================================
  // RESOLVE REVIEWER NAMES
  // ============================================================

  const reviewerIds = [
    ...new Set(
      history
        .map((item) => item.reviewed_by)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const reviewerMap = new Map<string, LearnerInfo>();

  let reviewersErrorMessage: string | null = null;

  if (reviewerIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .in("id", reviewerIds);

    if (error) {
      reviewersErrorMessage = error.message;
    } else {
      for (const reviewer of data ?? []) {
        reviewerMap.set(reviewer.id, {
          full_name: reviewer.full_name,
          email: reviewer.email,
        });
      }
    }
  }

  // ============================================================
  // FORMAT PENDING REVIEWS
  // ============================================================

  const pendingRecords: ReviewRecord[] = (
    (pending ?? []) as ReviewQueueItem[]
  ).map((item) => ({
    id: item.attempt_id,
    quizTitle: item.quiz_title,
    learnerName: item.learner_name || "Learner",
    learnerEmail: item.learner_email || "",
    attemptNumber: item.attempt_number ?? 1,
    maxAttempts: item.max_attempts ?? null,

    isCheckpoint:
      item.quiz_id != null &&
      checkpointQuizIds.has(item.quiz_id),

    dayNumber: item.quiz_id
      ? quizDayMap.get(item.quiz_id) ?? null
      : null,

    submittedAt: item.submitted_at ?? null,
    gradedAt: null,
    score: null,
    passed: null,
    pendingAnswers: Number(item.pending_answers ?? 0),
    gradingMethod: null,
    reviewerName: null,
    reviewerEmail: null,
    status: "needs_review",
  }));

  // ============================================================
  // FORMAT REVIEW HISTORY
  // ============================================================

  const historyRecords: ReviewRecord[] = history.map((item) => {
    const quiz = Array.isArray(item.quizzes)
      ? item.quizzes[0]
      : item.quizzes;

    const learner = Array.isArray(item.profiles)
      ? item.profiles[0]
      : item.profiles;

    const reviewer = item.reviewed_by
      ? reviewerMap.get(item.reviewed_by)
      : null;

    return {
      id: item.id,
      quizTitle: quiz?.title ?? "Quiz",
      learnerName: learner?.full_name || "Learner",
      learnerEmail: learner?.email || "",
      attemptNumber: item.attempt_number,
      maxAttempts: quiz?.max_attempts ?? null,

      isCheckpoint: checkpointQuizIds.has(item.quiz_id),

      dayNumber: quizDayMap.get(item.quiz_id) ?? null,

      submittedAt: item.submitted_at,
      gradedAt: item.graded_at,
      score: item.score,
      passed: item.passed,
      pendingAnswers: 0,
      gradingMethod: item.grading_method,
      reviewerName: reviewer?.full_name ?? null,
      reviewerEmail: reviewer?.email ?? null,
      status: item.status === "cancelled" ? "cancelled" : "graded",
    };
  });

  // ============================================================
  // ERRORS
  // ============================================================

  const errors = [
    modulesError?.message,
    checkpointsError?.message,
    queueError?.message,
    quizzesErrorMessage,
    historyErrorMessage,
    reviewersErrorMessage,
  ].filter((message): message is string => Boolean(message));

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">

          {/* ======================================================
              HELLOGOV PAGE HEADER
          ====================================================== */}

          <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
                Assessment Operations
              </p>

              <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[30px]">
                Review Center
              </h1>

              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
                Manage pending submissions, review learner assessments,
                and track grading results in one place.
              </p>
            </div>
          </section>

          {/* ======================================================
              ERROR MESSAGES
          ====================================================== */}

          {errors.map((message, index) => (
            <div
              key={index}
              className="mt-5 rounded-[14px] border border-red-200 bg-red-50 p-4 text-[12px] text-red-700"
            >
              {message}
            </div>
          ))}

          {/* ======================================================
              REVIEW CENTER DASHBOARD
          ====================================================== */}

          <ReviewCenterDashboard
            pending={pendingRecords}
            history={historyRecords}
          />

        </main>
      </div>
    </AppShell>
  );
}