
import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import QuizReviewLibrary, {
  type QuizLibraryItem,
} from "@/components/trainer/QuizReviewLibrary";

import { createClient } from "@/lib/supabase/server";
import { getTrainerPrograms } from "@/lib/trainer/getTrainerPrograms";

type PageProps = {
  searchParams: Promise<{
    programId?: string;
  }>;
};

type QuizRecord = {
  id: string;
  title: string;
  is_published: boolean;
  module_id: string | null;
  created_at: string | null;
  position: number;
};

type OrderedContent = {
  type: "module" | "checkpoint";
  id: string;
};

export default async function QuizReviewPage({
  searchParams,
}: PageProps) {
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

  // ---------------------------------------------------------
  // DYNAMIC PROGRAM SELECTION
  // ---------------------------------------------------------

  const programs = await getTrainerPrograms();
  const { programId } = await searchParams;

  const program =
    programs.find((item) => item.id === programId) ??
    programs[0];

  if (!program) {
    return (
      <AppShell
        role="trainer"
        userName={profile.full_name}
        userEmail={profile.email}
      >
        <div className="p-8">
          No training programs found.
        </div>
      </AppShell>
    );
  }

  // ---------------------------------------------------------
  // FETCH TRAINING DAYS
  // ---------------------------------------------------------

  const { data: days, error: daysError } = await supabase
    .from("days")
    .select("id,day_number,title,position")
    .eq("program_id", program.id)
    .order("position", { ascending: true })
    .order("day_number", { ascending: true })
    .order("id", { ascending: true });

  const dayIds = (days ?? []).map((day) => day.id);

  // ---------------------------------------------------------
  // FETCH MODULES, CHECKPOINTS AND DAY CONTENT
  // ---------------------------------------------------------

  const [
    { data: modules, error: modulesError },
    { data: checkpoints, error: checkpointsError },
    { data: dayContent, error: dayContentError },
  ] = await Promise.all([
    dayIds.length > 0
      ? supabase
          .from("modules")
          .select("id,day_id,title,position")
          .in("day_id", dayIds)
          .order("position", { ascending: true })
          .order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    dayIds.length > 0
      ? supabase
          .from("checkpoints")
          .select("id,title,quiz_id,day_id,position")
          .in("day_id", dayIds)
          .order("position", { ascending: true })
          .order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    dayIds.length > 0
      ? supabase
          .from("day_content")
          .select("id,day_id,content_type,content_id,position")
          .in("day_id", dayIds)
          .order("position", { ascending: true })
          .order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const moduleIds = (modules ?? []).map(
    (module) => module.id
  );

  const checkpointQuizIds = [
    ...new Set(
      (checkpoints ?? [])
        .map((checkpoint) => checkpoint.quiz_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const checkpointQuizIdSet = new Set(checkpointQuizIds);

  // ---------------------------------------------------------
  // FETCH ALL QUIZZES FOR SELECTED PROGRAM
  // ---------------------------------------------------------

  const [
    { data: quizzes, error: quizzesError },
    {
      data: checkpointQuizzes,
      error: checkpointQuizzesError,
    },
  ] = await Promise.all([
    moduleIds.length > 0
      ? supabase
          .from("quizzes")
          .select(
            "id,title,is_published,module_id,created_at,position"
          )
          .in("module_id", moduleIds)
          .order("position", { ascending: true })
          .order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    checkpointQuizIds.length > 0
      ? supabase
          .from("quizzes")
          .select(
            "id,title,is_published,module_id,created_at,position"
          )
          .in("id", checkpointQuizIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // ---------------------------------------------------------
  // BUILD LOOKUP MAPS
  // ---------------------------------------------------------

  const moduleMap = new Map(
    (modules ?? []).map((module) => [module.id, module])
  );

  const checkpointMap = new Map(
    (checkpoints ?? []).map((checkpoint) => [
      checkpoint.id,
      checkpoint,
    ])
  );

  const checkpointQuizMap = new Map(
    ((checkpointQuizzes ?? []) as QuizRecord[]).map(
      (quiz) => [quiz.id, quiz]
    )
  );

  const quizzesByModule = new Map<string, QuizRecord[]>();

  for (const quiz of (quizzes ?? []) as QuizRecord[]) {
    if (!quiz.module_id) continue;

    // Prevent checkpoint quizzes from appearing twice.
    if (checkpointQuizIdSet.has(quiz.id)) continue;

    const existing =
      quizzesByModule.get(quiz.module_id) ?? [];

    existing.push(quiz);

    quizzesByModule.set(quiz.module_id, existing);
  }

  // ---------------------------------------------------------
  // BUILD LIBRARY IN ORIGINAL PROGRAM ORDER
  // ---------------------------------------------------------

  const items: QuizLibraryItem[] = [];
  const addedQuizIds = new Set<string>();

  for (const day of days ?? []) {
    const orderedContent: OrderedContent[] = [];

    const addedModuleIds = new Set<string>();
    const addedCheckpointIds = new Set<string>();

    const currentDayContent = (dayContent ?? [])
      .filter((content) => content.day_id === day.id)
      .sort((a, b) => a.position - b.position);

    // -------------------------------------------------------
    // CANONICAL INTERLEAVED DAY CONTENT
    // -------------------------------------------------------

    for (const content of currentDayContent) {
      if (content.content_type === "module") {
        const module = moduleMap.get(content.content_id);

        if (!module || module.day_id !== day.id) continue;
        if (addedModuleIds.has(module.id)) continue;

        orderedContent.push({
          type: "module",
          id: module.id,
        });

        addedModuleIds.add(module.id);
      }

      if (content.content_type === "checkpoint") {
        const checkpoint = checkpointMap.get(
          content.content_id
        );

        if (!checkpoint || checkpoint.day_id !== day.id) {
          continue;
        }

        if (addedCheckpointIds.has(checkpoint.id)) continue;

        orderedContent.push({
          type: "checkpoint",
          id: checkpoint.id,
        });

        addedCheckpointIds.add(checkpoint.id);
      }
    }

    // -------------------------------------------------------
    // LEGACY FALLBACK — MODULES
    // -------------------------------------------------------

    const legacyModules = (modules ?? [])
      .filter(
        (module) =>
          module.day_id === day.id &&
          !addedModuleIds.has(module.id)
      )
      .sort((a, b) => a.position - b.position);

    for (const module of legacyModules) {
      orderedContent.push({
        type: "module",
        id: module.id,
      });

      addedModuleIds.add(module.id);
    }

    // -------------------------------------------------------
    // LEGACY FALLBACK — CHECKPOINTS
    // -------------------------------------------------------

    const legacyCheckpoints = (checkpoints ?? [])
      .filter(
        (checkpoint) =>
          checkpoint.day_id === day.id &&
          !addedCheckpointIds.has(checkpoint.id)
      )
      .sort((a, b) => a.position - b.position);

    for (const checkpoint of legacyCheckpoints) {
      orderedContent.push({
        type: "checkpoint",
        id: checkpoint.id,
      });

      addedCheckpointIds.add(checkpoint.id);
    }

    // -------------------------------------------------------
    // CONVERT ORDERED CONTENT INTO ASSESSMENT ITEMS
    // -------------------------------------------------------

    for (const content of orderedContent) {
      if (content.type === "module") {
        const module = moduleMap.get(content.id);

        if (!module) continue;

        const moduleQuizzes = [
          ...(quizzesByModule.get(module.id) ?? []),
        ].sort((a, b) => a.position - b.position);

        for (const quiz of moduleQuizzes) {
          if (addedQuizIds.has(quiz.id)) continue;

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

          addedQuizIds.add(quiz.id);
        }
      }

      if (content.type === "checkpoint") {
        const checkpoint = checkpointMap.get(content.id);

        if (!checkpoint?.quiz_id) continue;

        const quiz = checkpointQuizMap.get(
          checkpoint.quiz_id
        );

        if (!quiz || addedQuizIds.has(quiz.id)) continue;

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

        addedQuizIds.add(quiz.id);
      }
    }
  }

  // ---------------------------------------------------------
  // ERRORS
  // ---------------------------------------------------------

  const errors = [
    daysError?.message,
    modulesError?.message,
    checkpointsError?.message,
    dayContentError?.message,
    quizzesError?.message,
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
              Quiz Library
            </h1>

            <p className="mt-2 text-[14px] leading-6 text-[var(--text-secondary)]">
              Browse quizzes and checkpoints from any
              onboarding wave to review questions with
              trainees during live sessions.
            </p>
          </section>

          {/* PROGRAM SELECTOR */}

          <section className="mt-6 rounded-[14px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)]">
            <form
              method="GET"
              action="/trainer/quiz-review"
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex min-w-[240px] flex-1 flex-col gap-2">
                <label
                  htmlFor="quiz-review-program"
                  className="text-[12px] font-semibold text-[var(--text-secondary)]"
                >
                  Onboarding Wave
                </label>

                <select
                  id="quiz-review-program"
                  name="programId"
                  defaultValue={program.id}
                  className="w-full rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[#08A9C1]"
                >
                  {programs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="rounded-[10px] bg-[var(--teal)] px-5 py-3 text-[12px] font-semibold text-white transition hover:opacity-90"
              >
                View Wave
              </button>
            </form>

            <p className="mt-3 text-[12px] text-[var(--text-muted)]">
              Currently reviewing {program.title}.
              Assessments follow the original training
              program sequence.
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

          {/* QUIZ LIBRARY */}

          <QuizReviewLibrary
            key={program.id}
            items={items}
          />

        </main>
      </div>
    </AppShell>
  );
}
