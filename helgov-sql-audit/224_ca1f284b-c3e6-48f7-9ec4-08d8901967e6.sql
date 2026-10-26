│
◇  Downloading snippet...
-- ============================================================
-- QUERY 121
-- QUIZ ATTEMPT ↔ CHECKPOINT RESULT INTEGRITY
-- READ ONLY
-- ============================================================

select
  qa.id as attempt_id,
  qa.learner_id,
  qa.quiz_id,

  qa.status as quiz_attempt_status,
  qa.score as quiz_score,
  qa.passed as quiz_passed,
  qa.submitted_at as quiz_submitted_at,
  qa.graded_at as quiz_graded_at,

  c.id as checkpoint_id,
  c.title as checkpoint_title,

  cr.id as checkpoint_result_id,
  cr.status as checkpoint_status,
  cr.score as checkpoint_score,
  cr.passed as checkpoint_passed,
  cr.submitted_at as checkpoint_submitted_at,
  cr.graded_at as checkpoint_graded_at,

  case
    -- Quiz is still being worked on.
    when qa.status = 'in_progress'
      and (
        cr.id is null
        or cr.status = 'pending'
      )
      then 'OK'

    -- Quiz needs trainer review.
    when qa.status = 'needs_review'
      and cr.status = 'needs_review'
      then 'OK'

    -- Quiz has been finalized.
    when qa.status = 'graded'
      and cr.status = 'completed'
      and cr.score is not distinct from qa.score
      and cr.passed is not distinct from qa.passed
      then 'OK'

    -- Quiz is not attached to a checkpoint.
    when c.id is null
      then 'NOT A CHECKPOINT QUIZ'

    else 'CHECK'
  end as integrity_status

from public.quiz_attempts qa

left join public.checkpoints c
  on c.quiz_id = qa.quiz_id

left join public.checkpoint_results cr
  on cr.checkpoint_id = c.id
 and cr.learner_id = qa.learner_id

order by
  qa.started_at nulls last,
  qa.id;
