import Link from "next/link";
import type { LearnerDay } from "@/lib/learning/types";

type Props = {
  day: LearnerDay;
  unlocked: boolean;
  completed: boolean;
};

export default function LearnerDayCard({
  day,
  unlocked,
  completed,
}: Props) {
  return (
    <div
      className={`rounded-3xl border p-6 ${
        unlocked
          ? "border-slate-200 bg-white"
          : "border-slate-200 bg-slate-50 opacity-70"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e84545]">
            Day {day.day_number}
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            {day.title}
          </h3>

          {day.description && (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {day.description}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          {completed ? (
            <span className="text-sm font-semibold text-emerald-600">
              ✓ Completed
            </span>
          ) : unlocked ? (
            <Link
              href={`/learn/day/${day.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-[#101828] px-5 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#1d2939] hover:!text-white"
            >
              Open day
            </Link>
          ) : (
            <span className="text-sm font-medium text-slate-400">
              🔒 Locked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}