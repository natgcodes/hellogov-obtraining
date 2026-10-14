import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";

type PageProps = {
  params: Promise<{ quizId: string }>;
};

type QuizQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  instructions: string | null;
  points: number;
  position: number;
};

type QuizOption = {
  id: string;
  question_id: string;
  option_text: string;
  position: number;
  is_correct: boolean;
};

export default async function QuizReviewDetailPage({
  params,
}: PageProps) {
  const { quizId } = await params;
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
  // FETCH QUIZ
  // ---------------------------------------------------------

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(
      "id,title,description,instructions,module_id,is_published"
    )
    .eq("id", quizId)
    .maybeSingle();

  if (quizError || !quiz) notFound();

  // ---------------------------------------------------------
  // VERIFY QUIZ BELONGS TO TRAINER PROGRAM
  // ---------------------------------------------------------

  let dayInfo: {
    day_number: number;
    title: string;
  } | null = null;

  let sectionTitle = "";
  let assessmentType = "Quiz";
  let belongsToProgram = false;

  if (quiz.module_id) {
    const { data: module } = await supabase
      .from("modules")
      .select("id,title,day_id")
      .eq("id", quiz.module_id)
      .maybeSingle();

    if (module) {
      const { data: day } = await supabase
        .from("days")
        .select("id,day_number,title,program_id")
        .eq("id", module.day_id)
        .maybeSingle();

      if (day && day.program_id === program.id) {
        belongsToProgram = true;
        sectionTitle = module.title;

        dayInfo = {
          day_number: day.day_number,
          title: day.title,
        };
      }
    }
  }

  if (!belongsToProgram) {
    const { data: checkpoint } = await supabase
      .from("checkpoints")
      .select("id,title,day_id")
      .eq("quiz_id", quizId)
      .maybeSingle();

    if (checkpoint) {
      const { data: day } = await supabase
        .from("days")
        .select("id,day_number,title,program_id")
        .eq("id", checkpoint.day_id)
        .maybeSingle();

      if (day && day.program_id === program.id) {
        belongsToProgram = true;
        assessmentType = "Checkpoint";
        sectionTitle = checkpoint.title;

        dayInfo = {
          day_number: day.day_number,
          title: day.title,
        };
      }
    }
  }

  if (!belongsToProgram) notFound();

  // ---------------------------------------------------------
  // FETCH QUESTIONS
  // ---------------------------------------------------------

  const { data: questions, error: questionsError } =
    await supabase
      .from("quiz_questions")
      .select(
        "id,question_text,question_type,instructions,points,position"
      )
      .eq("quiz_id", quizId)
      .order("position", { ascending: true });

  const questionIds = (questions ?? []).map(
    (question) => question.id
  );

  // ---------------------------------------------------------
  // FETCH OPTIONS
  // ---------------------------------------------------------

  const { data: options, error: optionsError } =
    questionIds.length > 0
      ? await supabase
          .from("quiz_options")
          .select(
            "id,question_id,option_text,position,is_correct"
          )
          .in("question_id", questionIds)
          .order("position", { ascending: true })
      : { data: [], error: null };

  const optionsByQuestion = new Map<string, QuizOption[]>();

  for (const option of (options ?? []) as QuizOption[]) {
    const existing =
      optionsByQuestion.get(option.question_id) ?? [];

    existing.push(option);
    optionsByQuestion.set(option.question_id, existing);
  }

  const errors = [
    questionsError?.message,
    optionsError?.message,
  ].filter((message): message is string => Boolean(message));

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-7 sm:px-7 lg:px-8 lg:py-8">
        <main className="mx-auto w-full max-w-[1000px]">

          {/* BACK NAVIGATION */}

          <Link
            href="/trainer/quiz-review"
            className="text-[13px] font-medium text-[var(--teal)] hover:underline"
          >
            ← Back to Quiz Library
          </Link>

          {/* HEADER */}

          <section className="mt-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--teal)]">
              Assessment Resources · {assessmentType}
            </p>

            <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
              {quiz.title}
            </h1>

            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
              Day {dayInfo?.day_number} · {dayInfo?.title}
              {" · "}
              {sectionTitle}
            </p>

            {quiz.description && (
              <p className="mt-4 text-[14px] leading-6 text-[var(--text-secondary)]">
                {quiz.description}
              </p>
            )}

            <div className="mt-5 rounded-[12px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                Trainer preview · Read-only
              </p>

              <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                Review questions during live sessions.
                No answers or attempts will be submitted.
              </p>
            </div>
          </section>

          {/* ERRORS */}

          {errors.map((error, index) => (
            <div
              key={index}
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          ))}

          {/* QUESTIONS */}

          <section className="mt-8 space-y-5">
            {(questions ?? []).length === 0 && !questionsError && (
              <div className="rounded-[14px] border border-[var(--border)] bg-white p-6 text-sm text-[var(--text-secondary)]">
                This quiz does not have any questions yet.
              </div>
            )}

            {((questions ?? []) as QuizQuestion[]).map(
              (question, index) => {
                const questionOptions =
                  optionsByQuestion.get(question.id) ?? [];

                const hasCorrectAnswers =
                  questionOptions.some(
                    (option) => option.is_correct
                  );

                return (
                  <article
                    key={question.id}
                    className="rounded-[14px] border border-[var(--border)] bg-white p-5 sm:p-6"
                  >
                    {/* QUESTION HEADER */}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
                        Question {index + 1}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {hasCorrectAnswers && (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-[10px] font-semibold text-green-700">
                            Auto-graded
                          </span>
                        )}

                        <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-medium capitalize text-[var(--text-secondary)]">
                          {question.question_type.replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                      </div>
                    </div>

                    {/* QUESTION TEXT */}

                    <h2 className="mt-4 whitespace-pre-wrap text-[16px] font-semibold leading-7 text-[var(--text-primary)]">
                      {question.question_text}
                    </h2>

                    {/* INSTRUCTIONS */}

                    {question.instructions && (
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[var(--text-secondary)]">
                        {question.instructions}
                      </p>
                    )}

                    {/* ANSWER OPTIONS */}

                    {questionOptions.length > 0 && (
                      <div className="mt-5 space-y-2.5">
                        {questionOptions.map(
                          (option, optionIndex) => (
                            <div
                              key={option.id}
                              className={`flex items-start gap-3 rounded-[10px] border px-4 py-3 ${
                                option.is_correct
                                  ? "border-green-300 bg-green-50"
                                  : "border-[var(--border-soft)] bg-[var(--surface-soft)]"
                              }`}
                            >
                              {/* OPTION LETTER */}

                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white text-[11px] font-semibold ${
                                  option.is_correct
                                    ? "border-green-400 text-green-700"
                                    : "border-[var(--border)] text-[var(--text-secondary)]"
                                }`}
                              >
                                {String.fromCharCode(
                                  65 + optionIndex
                                )}
                              </span>

                              {/* OPTION TEXT */}

                              <div className="min-w-0 flex-1 pt-1">
                                <p className="whitespace-pre-wrap text-[13px] leading-5 text-[var(--text-primary)]">
                                  {option.option_text}
                                </p>

                                {option.is_correct && (
                                  <p className="mt-1 text-[11px] font-semibold text-green-700">
                                    ✓ Correct Answer
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* MANUAL REVIEW INDICATOR */}

                    {!hasCorrectAnswers && (
                      <div className="mt-5 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
                        <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                          Manual Review
                        </p>

                        <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
                          This question does not have a
                          predefined correct answer.
                          Review and discuss the response
                          with trainees during the session.
                        </p>
                      </div>
                    )}
                  </article>
                );
              }
            )}
          </section>
        </main>
      </div>
    </AppShell>
  );
}