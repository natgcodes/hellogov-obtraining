│
◇  Downloading snippet...
-- ============================================================
-- QUERY 99
-- Verify checkpoint_results after backfill
--
-- Diagnostic only.
-- Does not modify data.
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
  c.title as checkpoint_title,
  c.quiz_id,

  latest.id as latest_attempt_id,
  latest.status as attempt_status,
  latest.score as attempt_score,
  latest.passed as attempt_passed,

  cr.id as checkpoint_result_id,
  cr.status as result_status,
  cr.score as result_score,
  cr.passed as result_passed,

  case
    when latest.id is null
      and cr.id is null
      then 'OK - NOT STARTED'

    when latest.id is not null
      and cr.id is null
      then 'MISSING RESULT'

    when latest.status = 'in_progress'
      and cr.status = 'pending'
      then 'OK'

    when latest.status = 'needs_review'
      and cr.status = 'needs_review'
      then 'OK'

    when latest.status = 'graded'
      and cr.status = 'completed'
      and cr.score is not distinct from latest.score
      and cr.passed is not distinct from latest.passed
      then 'OK'

    else 'CHECK'
  end as sync_status

from public.checkpoints c

join public.days d
  on d.id = c.day_id

join target_program tp
  on tp.program_id = d.program_id

left join lateral (
  select
    qa.id,
    qa.status,
    qa.score,
    qa.passed,
    qa.attempt_number,
    qa.started_at
  from public.quiz_attempts qa
  join target_learner tl
    on tl.id = qa.learner_id
  where qa.quiz_id = c.quiz_id
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
  c.position;
