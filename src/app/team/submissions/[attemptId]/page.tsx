import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AnswerRow = {
  answer_id: string;
  question_id: string;
  question_position: number;
  question_text: string;
  question_type: string;
  question_points: number;
  answer_text: string | null;
  file_name: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  trainer_feedback: string | null;
  selected_option_text: string | null;
  match_left_text: string | null;
  match_right_text: string | null;
  match_position: number | null;
};

export default async function TeamSubmissionPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await client.from("profiles").select("role,account_status").eq("id", user.id).single();
  if (profile?.role !== "team_leader" || profile.account_status !== "active") redirect("/learn");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId)) notFound();

  // The authenticated RPC verifies the current assignment and submitted status.
  const access = await client.rpc("can_team_leader_view_submission", { target_attempt_id: attemptId });
  if (access.error || access.data !== true) notFound();
  const detail = await client.rpc("get_team_leader_submission_detail", { target_attempt_id: attemptId });
  if (detail.error) notFound();

  // Service role is used only for metadata, after authorization by the user's RPC.
  const admin = createAdminClient();
  const { data: attempt, error } = await admin.from("quiz_attempts")
    .select("id,learner_id,quiz_id,attempt_number,score,passed,status,submitted_at")
    .eq("id", attemptId).in("status", ["graded", "needs_review"]).not("submitted_at", "is", null).single();
  if (error || !attempt) notFound();
  const assignment = await admin.from("team_leader_assignments").select("learner_id")
    .eq("team_leader_id", user.id).eq("learner_id", attempt.learner_id).maybeSingle();
  if (assignment.error || !assignment.data) notFound();
  const [learner, quiz] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", attempt.learner_id).single(),
    admin.from("quizzes").select("title,passing_score").eq("id", attempt.quiz_id).single(),
  ]);
  if (learner.error || quiz.error || !learner.data || !quiz.data) notFound();
  const grouped = new Map<string, AnswerRow[]>();
  for (const row of (detail.data ?? []) as AnswerRow[]) {
    const group = grouped.get(row.answer_id) ?? [];
    group.push(row);
    grouped.set(row.answer_id, group);
  }
  const answers = [...grouped.values()].sort((a, b) => a[0].question_position - b[0].question_position);

  return <main className="mx-auto max-w-5xl px-6 py-8">
    <Link href="/team" className="text-sm font-semibold text-teal-700 hover:underline">← Back to My Team</Link>
    <header className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Submission review · Read only</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-800">{quiz.data.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{learner.data.full_name || "Trainee"} · Attempt {attempt.attempt_number}</p>
      <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-700">
        <span>Score: <strong>{attempt.score == null ? "Awaiting grading" : `${Number(attempt.score).toFixed(1)}%`}</strong></span>
        <span>Passing score: {quiz.data.passing_score}%</span>
        <span>Status: {attempt.status === "needs_review" ? "Awaiting review" : attempt.passed === true ? "Passed" : attempt.passed === false ? "Not passed" : "Graded"}</span>
        <span>Submitted: {new Date(attempt.submitted_at).toLocaleString("en-US", { timeZone: "America/Lima" })} (UTC−5)</span>
      </div>
      <p className="mt-4 text-xs text-slate-500">Review the submitted responses and trainer feedback. Answer keys and grading controls are not available in this view.</p>
    </header>
    <section className="mt-6 space-y-4" aria-label="Submitted answers">
      {answers.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No recorded answers in this submission.</p>}
      {answers.map((group, index) => {
        const answer = group[0];
        const ordered = [...group].sort((a, b) => (a.match_position ?? 0) - (b.match_position ?? 0));
        const choices = ordered.flatMap(row => row.selected_option_text == null ? [] : [row.selected_option_text]);
        const matches = ordered.filter(row => row.match_left_text != null);
        return <article key={answer.answer_id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {index + 1}</p>
            <span className={`text-xs font-semibold ${answer.is_correct === true ? "text-emerald-700" : answer.is_correct === false ? "text-rose-700" : "text-slate-500"}`}>{answer.is_correct === true ? "Correct" : answer.is_correct === false ? "Incorrect" : "Not marked"}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-800">{answer.question_text}</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="mb-2 text-xs font-semibold text-slate-500">Submitted response</p>
            {choices.length > 0 ? <ul className="space-y-1">{choices.map((choice, i) => <li key={i}>{choice}</li>)}</ul>
              : matches.length > 0 ? <ul className="space-y-1">{matches.map((row, i) => <li key={i}>{row.match_left_text} → {row.match_right_text ?? "—"}</li>)}</ul>
              : answer.file_name ? <p>{answer.file_name} <span className="text-xs text-slate-500">(attachment preview unavailable)</span></p>
              : <p className="whitespace-pre-wrap">{answer.answer_text || "No response recorded"}</p>}
          </div>
          <p className="mt-3 text-xs text-slate-500">Points: {answer.points_awarded ?? "—"} / {answer.question_points}</p>
          {answer.trainer_feedback && <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-semibold text-slate-500">Trainer feedback</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{answer.trainer_feedback}</p></div>}
        </article>;
      })}
    </section>
  </main>;
}
