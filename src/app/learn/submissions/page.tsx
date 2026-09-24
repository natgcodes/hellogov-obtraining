import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function LearnerSubmissionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "trainer") {
    redirect("/trainer");
  }

  const { data: attempts, error } = await supabase
    .from("quiz_attempts")
    .select(`
      id,
      attempt_number,
      score,
      passed,
      status,
      started_at,
      submitted_at,
      graded_at,

      quizzes (
        id,
        title,
        passing_score,
        show_results,
        modules (
          id,
          title,
          day_id,
          days (
            id,
            day_number,
            title
          )
        )
      )
    `)
    .eq("learner_id", user.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Unable to load submissions:",
      error
    );
  }

  const submittedAttempts = attempts ?? [];

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  return (
    <AppShell role="learner">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
            Assessments
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Submissions
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review your submitted assessments,
            scores, feedback, and review status.
          </p>
        </div>

        {error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-semibold text-red-800">
              Unable to load submissions
            </h2>

            <p className="mt-2 text-sm text-red-700">
              Your submitted assessments could
              not be loaded.
            </p>
          </div>
        ) : submittedAttempts.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
              ✓
            </div>

            <h2 className="mt-4 font-semibold text-slate-900">
              No submissions yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Your submitted assessments will
              appear here once you complete them.
            </p>

            <Link
              href="/learn"
              className="mt-5 inline-flex rounded-xl bg-[#101828] px-4 py-2.5 text-sm font-semibold !text-white"
            >
              Back to training
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {submittedAttempts.map((attempt) => {
              const quiz = Array.isArray(
                attempt.quizzes
              )
                ? attempt.quizzes[0]
                : attempt.quizzes;

              if (!quiz) return null;

              const moduleData = Array.isArray(
                quiz.modules
              )
                ? quiz.modules[0]
                : quiz.modules;

              const day =
                moduleData?.days?.[0] ?? null;

              const pending =
                attempt.status === "needs_review";

              const passed =
                attempt.passed === true;

              return (
                <article
                  key={attempt.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {day && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            Day {day.day_number}
                          </span>
                        )}

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          Attempt{" "}
                          {attempt.attempt_number}
                        </span>

                        {pending ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Pending review
                          </span>
                        ) : passed ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Passed
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                            Not passed
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-lg font-semibold text-slate-950">
                        {quiz.title}
                      </h2>

                      {moduleData && (
                        <p className="mt-1 text-sm text-slate-500">
                          {moduleData.title}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-slate-400">
                        Submitted{" "}
                        {formatDate(
                          attempt.submitted_at
                        )}
                      </p>
                    </div>

                    <div className="flex min-w-[180px] flex-col items-end">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {pending
                          ? "Partial score"
                          : "Final score"}
                      </p>

                      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                        {attempt.score !== null
                          ? `${Number(
                              attempt.score
                            )}%`
                          : "—"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Passing score:{" "}
                        {quiz.passing_score}%
                      </p>

                      <Link
                        href={`/learn/submissions/${attempt.id}`}
                        className="mt-4 inline-flex rounded-xl bg-[#101828] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#1d2939]"
                      >
                        View submission
                      </Link>
                    </div>
                  </div>

                  {pending && (
                    <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-sm font-medium text-amber-900">
                        Trainer review pending
                      </p>

                      <p className="mt-1 text-xs leading-5 text-amber-700">
                        Some questions require
                        manual review. The score
                        shown above is partial and
                        may change after your
                        trainer completes the
                        review.
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}