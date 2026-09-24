import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";
import type { LearnerSummary } from "@/lib/trainer/types";

type Props = {
  params: Promise<{
    learnerId: string;
  }>;
};

export default async function LearnerDetailPage({
  params,
}: Props) {
  const { learnerId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "trainer") {
    redirect("/learn");
  }

  const program = await getTrainerProgram();

  if (!program) notFound();

  const { data, error } = await supabase.rpc(
    "get_learner_training_summary",
    {
      target_program_id: program.id,
      target_learner_id: learnerId,
    }
  );

  if (error || !data) {
    notFound();
  }

  const summary =
    data as unknown as LearnerSummary;

  if (!summary.profile) {
    notFound();
  }

  return (
    <AppShell role="trainer">
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/trainer/learners"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to learners
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
              Learner Profile
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {summary.profile.full_name ||
                "Learner"}
            </h1>

            <p className="mt-1 text-slate-500">
              {summary.profile.email}
            </p>
          </div>

          {summary.enrollment && (
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {summary.enrollment.status.replaceAll(
                "_",
                " "
              )}
            </span>
          )}
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Tool Setup
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {summary.setup.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    item.completed
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {item.completed ? "✓" : "—"}
                </span>

                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.title}
                  </p>

                  {item.required && (
                    <p className="text-xs text-slate-400">
                      Required
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Module Progress
          </h2>

          <div className="mt-5 space-y-3">
            {summary.modules.map((module) => (
              <div
                key={module.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Day {module.day_number} ·{" "}
                    {module.day_title}
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {module.title}
                  </p>
                </div>

                <StatusBadge
                  status={module.status}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Quiz Attempts
          </h2>

          {summary.quiz_attempts.length ===
          0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No quiz attempts yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {summary.quiz_attempts.map(
                (attempt) => (
                  <div
                    key={attempt.attempt_id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {attempt.quiz_title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Attempt{" "}
                        {attempt.attempt_number}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {attempt.score !==
                        null && (
                        <span className="font-semibold text-slate-900">
                          {Number(
                            attempt.score
                          ).toFixed(2)}
                          %
                        </span>
                      )}

                      <StatusBadge
                        status={
                          attempt.status ===
                          "graded"
                            ? attempt.passed
                              ? "passed"
                              : "failed"
                            : attempt.status
                        }
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let styles =
    "bg-slate-100 text-slate-600";

  if (
    status === "completed" ||
    status === "passed"
  ) {
    styles =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    status === "in_progress" ||
    status === "submitted"
  ) {
    styles = "bg-blue-50 text-blue-700";
  }

  if (status === "needs_review") {
    styles = "bg-amber-50 text-amber-700";
  }

  if (status === "failed") {
    styles = "bg-red-50 text-red-700";
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}