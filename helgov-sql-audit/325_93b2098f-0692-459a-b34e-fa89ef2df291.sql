│
◇  Downloading snippet...
-- Query 28 — Inspect Submitted Quiz Data
-- Shows the latest submitted quiz attempt and its saved answers.

select
  qa.id as attempt_id,
  qa.quiz_id,
  qa.learner_id,
  qa.attempt_number,
  qa.score,
  qa.passed,
  qa.status,
  qa.submitted_at,
  q.title as quiz_title,
  q.passing_score,
  q.show_results,
  ans.id as answer_id,
  ans.question_id,
  qq.question_text,
  qq.question_type,
  qq.points,
  ans.selected_option_id,
  ans.answer_text,
  ans.file_path,
  ans.file_name,
  ans.is_correct,
  ans.points_awarded,
  ans.trainer_feedback,
  ans.graded_at
from public.quiz_attempts qa
join public.quizzes q
  on q.id = qa.quiz_id
left join public.quiz_answers ans
  on ans.attempt_id = qa.id
left join public.quiz_questions qq
  on qq.id = ans.question_id
where qa.submitted_at is not null
order by
  qa.submitted_at desc,
  qq.position asc;
