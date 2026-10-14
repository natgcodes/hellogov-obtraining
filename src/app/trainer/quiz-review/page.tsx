import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import QuizReviewLibrary, {
  type QuizLibraryItem,
} from "@/components/trainer/QuizReviewLibrary";

import { createClient } from "@/lib/supabase/server";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";

type QuizRecord = {
  id: string;
  title: string;
  is_published: boolean;
  module_id: string | null;
  created_at: string | null;
};

export default async function QuizReviewPage() {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
        <div className="p-8">No program found.</div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // FETCH DAYS
  // ---------------------------------------------------------

  const { data: days, error: daysError } = await supabase
    .from("days")
    .select("id,day_number,title")
    .eq("program_id", program.id)
    .order("day_number");

  const dayIds = (days ?? []).map((day) => day.id);

  // ---------------------------------------------------------
  // FETCH MODULES
  // ---------------------------------------------------------

  const { data: modules, error: modulesError } =
    dayIds.length > 0
      ? await supabase
          .from("modules")
          .select("id,day_id,title")
          .in("day_id", dayIds)
      : { data: [], error: null };

  const moduleIds = (modules ?? []).map(
    (module) => module.id
  );

  // ---------------------------------------------------------
  // FETCH MODULE QUIZZES AND CHECKPOINTS
  // ---------------------------------------------------------

  const [
    { data: quizzes, error: quizzesError },
    { data: checkpoints, error: checkpointsError },
  ] = await Promise.all([
    moduleIds.length > 0
      ? supabase
          .from("quizzes")
          .select(
            "id,title,is_published,module_id,created_at"
          )
          .in("module_id", moduleIds)
      : Promise.resolve({ data: [], error: null }),

    dayIds.length > 0
      ? supabase
          .from("checkpoints")
          .select("id,title,quiz_id,day_id")
          .in("day_id", dayIds)
          .not("quiz_id", "is", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // ---------------------------------------------------------
  // BUILD LOOKUP MAPS
  // ---------------------------------------------------------

  const dayMap = new Map(
    (days ?? []).map((day) => [day.id, day])
  );

  const moduleMap = new Map(
    (modules ?? []).map((module) => [
      module.id,
      module,
    ])
  );

  // ---------------------------------------------------------
  // FETCH CHECKPOINT QUIZZES
  // ---------------------------------------------------------

  const checkpointQuizIds = [
    ...new Set(
      (checkpoints ?? [])
        .map((checkpoint) => checkpoint.quiz_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const {
    data: checkpointQuizzes,
    error: checkpointQuizzesError,
  } =
    checkpointQuizIds.length > 0
      ? await supabase
          .from("quizzes")
          .select(
            "id,title,is_published,module_id,created_at"
          )
          .in("id", checkpointQuizIds)
      : { data: [], error: null };

  // ---------------------------------------------------------
  // BUILD LIBRARY ITEMS
  // ---------------------------------------------------------

  const items: QuizLibraryItem[] = [];

  // MODULE QUIZZES

  for (const quiz of (quizzes ?? []) as QuizRecord[]) {
    const module = quiz.module_id
      ? moduleMap.get(quiz.module_id)
      : null;

    const day = module
      ? dayMap.get(module.day_id)
      : null;

    if (!module || !day) continue;

    items.push({
      id: quiz.id,
      title: quiz.title,
      dayNumber: day.day_number,
      dayTitle: day.title,
      sectionTitle: module.title,
      type: "Quiz",
      published: quiz.is_published,
      createdAt: quiz.created_at,
    });
  }

  // CHECKPOINT QUIZZES

  const checkpointQuizMap = new Map(
    ((checkpointQuizzes ?? []) as QuizRecord[]).map(
      (quiz) => [quiz.id, quiz]
    )
  );

  for (const checkpoint of checkpoints ?? []) {
    if (!checkpoint.quiz_id) continue;

    const quiz = checkpointQuizMap.get(
      checkpoint.quiz_id
    );

    const day = dayMap.get(checkpoint.day_id);

    if (!quiz || !day) continue;

    items.push({
      id: quiz.id,
      title: quiz.title,
      dayNumber: day.day_number,
      dayTitle: day.title,
      sectionTitle: checkpoint.title,
      type: "Checkpoint",
      published: quiz.is_published,
      createdAt: quiz.created_at,
    });
  }

  // ---------------------------------------------------------
  // SORT LIBRARY
  // ---------------------------------------------------------

  items.sort(
    (a, b) =>
      a.dayNumber - b.dayNumber ||
      a.title.localeCompare(b.title)
  );

  // ---------------------------------------------------------
  // ERRORS
  // ---------------------------------------------------------

  const errors = [
    daysError?.message,
    modulesError?.message,
    quizzesError?.message,
    checkpointsError?.message,
    checkpointQuizzesError?.message,
  ].filter((message): message is string => Boolean(message));

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1440px]">

          {/* PAGE HEADER */}

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
              Assessment Resources
            </p>

            <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
              Quiz Review
            </h1>

            <p className="mt-2 text-[14px] leading-6 text-[var(--text-secondary)]">
              Browse quizzes and checkpoints to review
              questions with trainees during live sessions.
            </p>
          </section>

          {/* ERROR MESSAGES */}

          {errors.map((error, index) => (
            <div
              key={index}
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          ))}

          {/* QUIZ LIBRARY WITH DATE FILTER */}

          <QuizReviewLibrary items={items} />

        </main>
      </div>
    </AppShell>
  );
}