import Link from "next/link";
import MaterialCard from "./MaterialCard";
import ActivityCard from "./ActivityCard";
import type {
  LearnerModule,
  ProgressMap,
} from "@/lib/learning/types";

type Props = {
  module: LearnerModule;
  progress: ProgressMap;
};

export default function LearnerModuleCard({
  module,
  progress,
}: Props) {
  const status =
    progress.modules[module.id] ?? "not_started";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            {module.duration_minutes && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {module.duration_minutes} min
              </span>
            )}

            {module.is_required && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-[#e84545]">
                Required
              </span>
            )}
          </div>

          <h3 className="mt-3 text-xl font-semibold text-slate-950">
            {module.title}
          </h3>

          {module.description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {module.description}
            </p>
          )}

          {module.objective && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Learning objective
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-950">
                {module.objective}
              </p>
            </div>
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "completed"
              ? "bg-emerald-50 text-emerald-700"
              : status === "in_progress"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {status === "completed"
            ? "Completed"
            : status === "in_progress"
              ? "In progress"
              : "Not started"}
        </span>
      </div>

      {module.materials.length > 0 && (
        <div className="mt-7">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Materials
          </h4>

          <div className="space-y-3">
            {module.materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                moduleId={module.id}
                completed={
                  progress.materials[material.id] ?? false
                }
              />
            ))}
          </div>
        </div>
      )}

      {module.activities.length > 0 && (
        <div className="mt-7">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Practice
          </h4>

          <div className="space-y-3">
            {module.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                moduleId={module.id}
                status={
                  progress.activities[activity.id] ??
                  "not_started"
                }
              />
            ))}
          </div>
        </div>
      )}

      {module.quizzes.length > 0 && (
        <div className="mt-7">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Knowledge Checks
          </h4>

          <div className="space-y-3">
            {module.quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-purple-100 bg-purple-50/40 p-4"
              >
                <div>
                  <h5 className="font-semibold text-slate-900">
                    {quiz.title}
                  </h5>

                  <p className="mt-1 text-sm text-slate-500">
                    Passing score: {quiz.passing_score}% ·{" "}
                    {quiz.max_attempts}{" "}
                    {quiz.max_attempts === 1
                      ? "attempt"
                      : "attempts"}
                  </p>
                </div>

                <Link
                  href={`/learn/quiz/${quiz.id}`}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Start quiz
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}