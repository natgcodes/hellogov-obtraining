import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getTrainerProgram } from "@/lib/trainer/getTrainerProgram";

type TrainerLearner = {
  learner_id: string;
  full_name: string | null;
  email: string | null;
  enrollment_status: string;
  progress_percent: number | null;
  completed_modules: number;
  total_modules: number;
  passed_quizzes: number;
  total_quizzes: number;
  needs_review: number;
};

export default async function TrainerLearnersPage() {
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

  if (profile?.role !== "trainer") {
    redirect("/learn");
  }

  const program = await getTrainerProgram();

  if (!program) {
    return (
      <AppShell role="trainer">
        <main className="mx-auto max-w-7xl px-6 py-10">
          <p>No program found.</p>
        </main>
      </AppShell>
    );
  }

  const { data, error } = await supabase.rpc(
    "get_trainer_learners",
    {
      target_program_id: program.id,
    }
  );

  const learners = (data ?? []) as TrainerLearner[];

  const totalLearners = learners.length;

  const completed = learners.filter(
    (learner) =>
      learner.enrollment_status === "completed"
  ).length;

  const needsReview = learners.reduce(
    (total, learner) =>
      total + Number(learner.needs_review ?? 0),
    0
  );

  const averageProgress =
    totalLearners > 0
      ? learners.reduce(
          (total, learner) =>
            total +
            Number(learner.progress_percent ?? 0),
          0
        ) / totalLearners
      : 0;

  return (
    <AppShell role="trainer">
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
              Training Operations
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Learners
            </h1>

            <p className="mt-2 text-slate-500">
              Track onboarding progress, assessments and certification.
            </p>
          </div>

          <Link
            href="/trainer/review"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-slate-800"
          >
            Review Center
            {needsReview > 0 ? ` (${needsReview})` : ""}
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Learners"
            value={totalLearners}
          />

          <Metric
            label="Average progress"
            value={`${Math.round(averageProgress)}%`}
          />

          <Metric
            label="Completed"
            value={completed}
          />

          <Metric
            label="Needs review"
            value={needsReview}
          />
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-semibold text-slate-950">
              Onboarding roster
            </h2>
          </div>

          {learners.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No learners have started this program yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3">
                      Learner
                    </th>

                    <th className="px-4 py-3">
                      Progress
                    </th>

                    <th className="px-4 py-3">
                      Modules
                    </th>

                    <th className="px-4 py-3">
                      Quizzes
                    </th>

                    <th className="px-4 py-3">
                      Review
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-6 py-3" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {learners.map((learner) => {
                    const progress = Number(
                      learner.progress_percent ?? 0
                    );

                    return (
                      <tr
                        key={learner.learner_id}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">
                            {learner.full_name || "Learner"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {learner.email || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="w-36">
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-slate-500">
                                Progress
                              </span>

                              <span className="font-semibold text-slate-800">
                                {Math.round(progress)}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-[#e84545]"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(100, progress)
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {Number(
                            learner.completed_modules ?? 0
                          )}
                          /
                          {Number(
                            learner.total_modules ?? 0
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {Number(
                            learner.passed_quizzes ?? 0
                          )}
                          /
                          {Number(
                            learner.total_quizzes ?? 0
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {Number(
                            learner.needs_review ?? 0
                          ) > 0 ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              {Number(
                                learner.needs_review
                              )}{" "}
                              pending
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge
                            status={
                              learner.enrollment_status
                            }
                          />
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/trainer/learners/${learner.learner_id}`}
                            className="text-sm font-semibold text-slate-900 transition hover:text-[#e84545]"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "in_progress"
        ? "bg-blue-50 text-blue-700"
        : "bg-slate-100 text-slate-600";

  const label = status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}