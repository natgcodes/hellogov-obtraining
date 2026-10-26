│
◇  Downloading snippet...
-- ============================================================
-- QUERY 94
-- Verify learner checkpoints directly
--
-- Diagnostic only.
-- Does not modify any data.
-- ============================================================

with target_learner as (
  select id
  from public.profiles
  where email = 'learner@test.com'
  limit 1
),

target_program as (
  select pe.program_id
  from public.program_enrollments pe
  join target_learner tl
    on tl.id = pe.learner_id
  limit 1
)

select
  c.id as checkpoint_id,
  c.title as checkpoint_title,
  c.checkpoint_type,
  c.position as checkpoint_position,
  c.is_required,

  d.id as day_id,
  d.day_number,
  d.title as day_title,

  q.id as quiz_id,
  q.title as quiz_title,

  coalesce(
    c.passing_score,
    q.passing_score
  ) as passing_score,

  q.max_attempts,

  (
    select count(*)
    from public.quiz_attempts qa_count
    join target_learner tl
      on tl.id = qa_count.learner_id
    where qa_count.quiz_id = q.id
  ) as attempt_count,

  latest.id as latest_attempt_id,
  latest.attempt_number as latest_attempt_number,
  latest.score as latest_score,
  latest.passed as latest_passed,
  latest.status as latest_status,
  latest.submitted_at as latest_submitted_at,
  latest.graded_at as latest_graded_at,

  cr.id as checkpoint_result_id,
  cr.status as checkpoint_result_status,
  cr.score as checkpoint_result_score,
  cr.passed as checkpoint_result_passed,
  cr.submitted_at as checkpoint_result_submitted_at,
  cr.graded_at as checkpoint_result_graded_at

from public.checkpoints c

join public.days d
  on d.id = c.day_id

join target_program tp
  on tp.program_id = d.program_id

left join public.quizzes q
  on q.id = c.quiz_id

left join lateral (
  select
    qa.id,
    qa.attempt_number,
    qa.score,
    qa.passed,
    qa.status,
    qa.submitted_at,
    qa.graded_at,
    qa.started_at
  from public.quiz_attempts qa
  join target_learner tl
    on tl.id = qa.learner_id
  where qa.quiz_id = q.id
  order by
    qa.attempt_number desc,
    qa.started_at desc
  limit 1
) latest on true

left join public.checkpoint_results cr
  on cr.checkpoint_id = c.id
  and cr.learner_id = (
    select id
    from target_learner
  )

where d.is_published = true

order by
  d.position,
  d.day_number,
  c.position,
  c.title;
