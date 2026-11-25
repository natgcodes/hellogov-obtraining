"use client";

import { useState } from "react";

export type MissingAssessment = {
  learner_id: string;
  learner_name: string;
  program_id: string;
  program_title: string;
  day_number: number;
  latest_confirmed_day: number | null;
  quiz_id: string;
  quiz_title: string;
  assessment_type: string;
  assessment_status: string;
  has_in_progress: boolean;
  cancelled_attempts: number;
};

export default function MissingAssessments({ rows, failed }: { rows: MissingAssessment[]; failed: boolean }) {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = rows.filter(row => (status === "all" || row.assessment_status === status) && `${row.learner_name} ${row.program_title} ${row.quiz_title}`.toLowerCase().includes(search.trim().toLowerCase()));
  const grouped = new Map<string, MissingAssessment[]>();
  for (const row of filtered) {
    const key = `${row.program_id}:${row.learner_id}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }
  const metrics = [
    { label: "Affected learners", value: new Set(filtered.map(row => row.learner_id)).size },
    { label: "Missing assessments", value: filtered.length },
    { label: "Possibly skipped", value: filtered.filter(row => row.assessment_status === "Skipped").length },
  ];
  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Missing assessments">
    <h2 className="text-xl font-semibold text-slate-800">Missing Assessments</h2>
    <p className="mt-2 text-xs leading-5 text-slate-500">Required, published quizzes not submitted, across the selected waves. Skipped indicates later confirmed learning activity, not intentional omission. Future days are excluded; for learners without confirmed activity, the first published day is shown.</p>
    {failed ? <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Missing assessments could not be loaded. Refresh the dashboard to retry.</p> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{metrics.map(metric => <div key={metric.label} className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-2 text-2xl font-semibold text-slate-800">{metric.value}</p></div>)}</div>
      <div className="mt-5 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">Assessment status<select value={status} onChange={e => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option><option value="Skipped">Skipped</option><option value="In progress">In progress</option><option value="Not started">Not started</option><option value="Cancelled - Pending">Cancelled - Pending</option></select></label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-600">Search<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Learner, wave or quiz" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
      </div>
      <div className="mt-5 space-y-3">
        {grouped.size === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No missing assessments match these filters.</p>}
        {[...grouped.entries()].map(([key, group]) => <details key={key} className="rounded-xl border border-slate-200 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">{group[0].learner_name} · {group[0].program_title} <span className="ml-2 text-xs font-medium text-slate-500">{group.length} missing · {group.filter(row => row.assessment_status === "Skipped").length} possibly skipped</span></summary>
          <p className="mt-2 text-xs text-slate-500">Latest confirmed activity: {group[0].latest_confirmed_day == null ? "None" : `Day ${group[0].latest_confirmed_day}`}</p>
          <div className="mt-3 divide-y divide-slate-100">{group.map(row => <div key={row.quiz_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div><p className="text-sm font-medium text-slate-700">{row.quiz_title}</p><p className="mt-1 text-xs text-slate-500">Day {row.day_number} · {row.assessment_type === "checkpoint" ? "Checkpoint quiz" : "Module quiz"}{row.assessment_status === "Skipped" && row.has_in_progress ? " · Attempt in progress" : ""}{row.cancelled_attempts > 0 ? ` · ${row.cancelled_attempts} cancelled attempt(s)` : ""}</p></div>
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${row.assessment_status === "Skipped" ? "bg-rose-50 text-rose-700" : row.has_in_progress ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{row.assessment_status}</span>
          </div>)}</div>
        </details>)}
      </div>
    </>}
  </section>;
}
