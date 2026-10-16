"use client";

import { useMemo, useState } from "react";
import type { LeaderboardData, RankedLearner, TopicScore } from "@/lib/trainer/getLeaderboard";

const fmt = (value: number | null) => value == null ? "—" : `${value.toFixed(1)}%`;
const panel = "rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm";
const time = (n: number | null) => n == null ? "—" : n < 60 ? `${Math.round(n)} min` : `${(n / 60).toFixed(1)} hr`;
function tone(n: number | null) {
  if (n == null) return { bg: "bg-slate-100", text: "text-slate-500", bar: "bg-slate-300", label: "Not graded" };
  if (n >= 90) return { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-400", label: "Excellent" };
  if (n >= 80) return { bg: "bg-sky-50", text: "text-sky-700", bar: "bg-sky-400", label: "Good" };
  if (n >= 70) return { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-400", label: "Developing" };
  return { bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-300", label: "Needs support" };
}
function Topics({ title, topics, descending = true }: { title: string; topics: TopicScore[]; descending?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...topics].sort((a, b) => descending ? b.average - a.average : a.average - b.average);
  const visible = expanded ? sorted : sorted.slice(0, 3);
  return <div className={panel}>
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-800">{title}</h3><span className="text-xs text-slate-400">{sorted.length} topics</span></div>
    {visible.length ? <div className="mt-5 space-y-4">{visible.map(t => { const c = tone(t.average); return <div key={t.topic}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 break-words font-medium text-slate-700">{t.topic}</span><span className={`shrink-0 rounded-md px-2 py-1 font-semibold ${c.bg} ${c.text}`}>{fmt(t.average)}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.min(100, Math.max(0, t.average))}%` }} /></div>
      <p className="mt-1 text-[11px] text-slate-400">{t.count} graded {t.count === 1 ? "result" : "results"}</p>
    </div>; })}</div> : <p className="mt-4 text-xs text-slate-400">No graded topics yet.</p>}
    {sorted.length > 3 && <button type="button" onClick={() => setExpanded(!expanded)} className="mt-5 text-xs font-semibold text-teal-700 hover:underline">{expanded ? "Show less ↑" : `Show all ${sorted.length} topics ↓`}</button>}
  </div>;
}
function Metric({ title, name, detail, accent }: { title: string; name: string; detail: string; accent: string }) {
  return <div className={`${panel} border-l-4 ${accent}`}><p className="text-xs font-medium text-slate-500">{title}</p><p className="mt-3 truncate text-lg font-semibold text-slate-800" title={name}>{name}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}
export default function TrainingLeaderboard({ data }: { data: LeaderboardData }) {
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const scored = data.learners.filter(l => l.average != null);
  const top = scored[0], lowest = scored[scored.length - 1];
  const timed = data.learners.filter(l => l.averageModuleMinutes != null).sort((a, b) => (a.averageModuleMinutes ?? 0) - (b.averageModuleMinutes ?? 0));
  const fastest = timed[0], slowest = timed[timed.length - 1];
  const selected: RankedLearner | undefined = data.learners.find(l => l.id === selectedId) ?? top ?? data.learners[0];
  const filtered = useMemo(() => data.learners.filter(l => `${l.name} ${l.email}`.toLowerCase().includes(search.toLowerCase())), [data.learners, search]);
  return <section className="mt-8 space-y-5" aria-label="Training performance leaderboard">
    <div><p className="text-[11px] font-semibold uppercase tracking-widest text-teal-700">Training performance</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-800">Learner Leaderboard</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">Based on the latest graded attempt per quiz. Unreviewed quizzes are excluded, so rankings remain provisional until grading is complete. Deactivated learners are excluded.</p></div>
    {data.warning && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">{data.warning}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="🏆 Top scorer" name={top?.name ?? "—"} detail={top ? `${fmt(top.average)} average` : "No graded quizzes"} accent="border-l-amber-300" />
      <Metric title="Needs support" name={lowest?.name ?? "—"} detail={lowest ? `${fmt(lowest.average)} average` : "No graded quizzes"} accent="border-l-rose-200" />
      <Metric title="Class average" name={fmt(data.classAverage)} detail="Across all graded quiz results" accent="border-l-sky-300" />
      <Metric title="Quizzes in program" name={String(data.expectedCount)} detail={`${scored.length} learners with graded quizzes`} accent="border-l-teal-300" />
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Metric title="⚡ Fastest learner" name={fastest?.name ?? "—"} detail={fastest ? `${time(fastest.averageModuleMinutes)} average · ${fastest.timedModuleCount} completed modules` : "No module timing data yet"} accent="border-l-emerald-300" />
      <Metric title="⏳ Slowest learner" name={slowest?.name ?? "—"} detail={slowest ? `${time(slowest.averageModuleMinutes)} average · ${slowest.timedModuleCount} completed modules` : "No module timing data yet"} accent="border-l-violet-300" />
    </div>
    <p className="text-[11px] leading-5 text-slate-400">Learning pace measures elapsed time from module start to completion, not active study time. Only completed modules with valid timestamps are included; averages may cover different numbers of modules.</p>
    <div className="grid gap-4 lg:grid-cols-2"><Topics title="✦ Strongest topics" topics={data.topics} /><Topics title="↗ Topics needing reinforcement" topics={data.topics} descending={false} /></div>
    <div className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-semibold text-slate-800">All learner rankings</h3><p className="mt-1 text-xs text-slate-400">Select a learner to explore their results</p></div><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learner" aria-label="Search learner" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-400 sm:w-60" /></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="border-b border-slate-100 text-slate-400"><tr><th className="py-3 pr-3">Rank</th><th className="py-3 pr-3">Learner</th><th className="py-3 pr-3">Overall average</th><th className="py-3 pr-3">Graded quizzes</th><th className="py-3">Status</th></tr></thead><tbody>{filtered.map(l => { const c = tone(l.average); return <tr key={l.id} onClick={() => setSelectedId(l.id)} className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${selected?.id === l.id ? "bg-teal-50/50" : ""}`}><td className="py-3.5 pr-3"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-bold ${l.rank === 1 ? "bg-amber-100 text-amber-800" : l.rank === 2 ? "bg-slate-200 text-slate-700" : l.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-500"}`}>{l.rank ?? "—"}</span></td><td className="py-3.5 pr-3"><span className="font-semibold text-slate-800">{l.name}</span><br/><span className="text-slate-400">{l.email}</span></td><td className="py-3.5 pr-3"><span className={`inline-block rounded-lg px-2 py-1 font-semibold ${c.bg} ${c.text}`}>{fmt(l.average)}</span><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.min(100, Math.max(0, l.average ?? 0))}%` }} /></div></td><td className="py-3.5 pr-3 text-slate-600">{l.gradedCount}/{l.expectedCount}</td><td className="py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${l.complete ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{l.complete ? "Complete" : "Provisional"}</span></td></tr>; })}</tbody></table>{!filtered.length && <p className="py-5 text-xs text-slate-400">No learners found.</p>}</div>
    </div>
    {selected && <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-semibold text-slate-800">Individual highlights · {selected.name}</h3><p className="mt-1 text-xs text-slate-500">Rank #{selected.rank ?? "—"} · Overall average {fmt(selected.average)} · {selected.gradedCount}/{selected.expectedCount} quizzes graded</p></div>{selected.averageModuleMinutes != null && <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">Average module time: {time(selected.averageModuleMinutes)} ({selected.timedModuleCount} modules)</span>}</div><div className="grid gap-4 md:grid-cols-2"><Topics key={`${selected.id}-best`} title="Best topics" topics={selected.topics} /><Topics key={`${selected.id}-improve`} title="Topics to improve" topics={selected.topics} descending={false} /></div></div>}
  </section>;
}
