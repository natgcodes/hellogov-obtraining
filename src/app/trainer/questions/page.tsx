import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import QuestionStatusButton from "@/components/trainer/QuestionStatusButton";

type LearnerQuestion = {
  id: string;
  learner_id: string;
  group_number: string | null;
  question: string;
  status: string;
  created_at: string;
  answered_at: string | null;
  profiles:
    | {
        full_name: string | null;
        email: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
      }[]
    | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getLearnerProfile(question: LearnerQuestion) {
  if (Array.isArray(question.profiles)) {
    return question.profiles[0] ?? null;
  }

  return question.profiles;
}

export default async function TrainerQuestionsPage() {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "trainer"
  ) {
    redirect("/learn");
  }

  // ---------------------------------------------------------
  // QUESTIONS
  // ---------------------------------------------------------

  const {
    data,
    error,
  } = await supabase
    .from("training_questions")
    .select(`
      id,
      learner_id,
      group_number,
      question,
      status,
      created_at,
      answered_at,
      profiles:learner_id (
        full_name,
        email
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Unable to load learner questions:",
      error
    );
  }

  const questions =
    (data ?? []) as LearnerQuestion[];

  const openQuestions = questions.filter(
    (question) =>
      question.status !== "answered"
  );

  const answeredQuestions = questions.filter(
    (question) =>
      question.status === "answered"
  );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <AppShell
      role="trainer"
      userName={profile.full_name}
      userEmail={profile.email}
    >
      <div className="px-5 py-8 sm:px-7 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          {/* HEADER */}

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--teal)]">
              Training Support
            </p>

            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
              General Q&amp;A
            </h1>

            <p className="mt-2 max-w-[680px] text-[13px] leading-6 text-[var(--text-secondary)]">
              Questions submitted by learners during
              onboarding are visible here to the entire
              Training team.
            </p>
          </section>

          {/* METRICS */}

          <section className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[14px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)]">
              <p className="text-[11px] font-medium text-[var(--text-muted)]">
                Open questions
              </p>

              <p className="mt-2 text-[26px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                {openQuestions.length}
              </p>
            </div>

            <div className="rounded-[14px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)]">
              <p className="text-[11px] font-medium text-[var(--text-muted)]">
                Answered
              </p>

              <p className="mt-2 text-[26px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                {answeredQuestions.length}
              </p>
            </div>

            <div className="rounded-[14px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-xs)]">
              <p className="text-[11px] font-medium text-[var(--text-muted)]">
                Total questions
              </p>

              <p className="mt-2 text-[26px] font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                {questions.length}
              </p>
            </div>
          </section>

          {/* QUESTIONS */}

          <section className="mt-7">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Learner questions
                </h2>

                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  Most recent questions appear first.
                </p>
              </div>

              {openQuestions.length > 0 && (
                <span className="rounded-full bg-[var(--teal-soft)] px-3 py-1.5 text-[10px] font-semibold text-[var(--teal-deep)]">
                  {openQuestions.length} open
                </span>
              )}
            </div>

            {questions.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[var(--border-strong)] bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--teal-soft)] text-[var(--teal-deep)]">
                  ?
                </div>

                <h3 className="mt-4 text-[14px] font-semibold text-[var(--text-primary)]">
                  No questions yet
                </h3>

                <p className="mx-auto mt-1 max-w-[420px] text-[12px] leading-5 text-[var(--text-secondary)]">
                  Questions submitted through the learner
                  Help &amp; Q&amp;A box will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-white shadow-[var(--shadow-xs)]">
                {questions.map(
                  (question, index) => {
                    const learner =
                      getLearnerProfile(question);

                    const learnerName =
                      learner?.full_name ||
                      "Learner";

                    const answered =
                      question.status ===
                      "answered";

                    return (
                      <article
                        key={question.id}
                        className={`p-5 sm:p-6 ${
                          index > 0
                            ? "border-t border-[var(--border-soft)]"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            {/* LEARNER */}

                            <div className="flex items-start gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--teal-soft)] text-[10px] font-semibold text-[var(--teal-deep)]">
                                {learnerName
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[12px] font-semibold text-[var(--text-primary)]">
                                    {learnerName}
                                  </p>

                                  {question.group_number && (
                                    <span className="inline-flex rounded-full bg-[var(--teal-soft)] px-2 py-0.5 text-[9px] font-semibold text-[var(--teal-deep)]">
                                      Group{" "}
                                      {question.group_number}
                                    </span>
                                  )}
                                </div>

                                {learner?.email && (
                                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                                    {learner.email}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* QUESTION */}

                            <p className="mt-4 max-w-[760px] whitespace-pre-wrap text-[13px] leading-6 text-[var(--text-secondary)]">
                              {question.question}
                            </p>

                            {/* DATE */}

                            <p className="mt-3 text-[10px] text-[var(--text-muted)]">
                              Submitted{" "}
                              {formatDate(
                                question.created_at
                              )}
                            </p>
                          </div>

                          {/* STATUS + ACTION */}

<div className="flex shrink-0 flex-col items-end gap-2 sm:translate-y-4">
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
      answered
        ? "bg-[var(--success-soft)] text-[var(--success)]"
        : "bg-[var(--teal-soft)] text-[var(--teal-deep)]"
    }`}
  >
    {answered ? "Resolved" : "Open"}
  </span>

  <QuestionStatusButton
    questionId={question.id}
    answered={answered}
  />
</div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}