│
◇  Downloading snippet...
-- ============================================================
-- QUERY 76
-- Debug learner assessments / attempt history
--
-- Diagnostic only.
-- Does not modify any data.
-- ============================================================

select
  qa.id as attempt_id,
  qa.learner_id,
  pr.full_name,
  pr.email,

  qa.quiz_id,
  q.title as quiz_title,
  q.module_id,

  m.title as module_title,
  d.day_number,
  d.title as day_title,

  qa.attempt_number,
  qa.score,
  qa.passed,
  qa.status,

  qa.started_at,
  qa.submitted_at,
  qa.graded_at

from public.quiz_attempts qa

join public.profiles pr
  on pr.id = qa.learner_id

left join public.quizzes q
  on q.id = qa.quiz_id

left join public.modules m
  on m.id = q.module_id

left join public.days d
  on d.id = m.day_id

where pr.email = 'learner@test.com'

order by
  qa.started_at desc nulls last,
  qa.attempt_number desc;
