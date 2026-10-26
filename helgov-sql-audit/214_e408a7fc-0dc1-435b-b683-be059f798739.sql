│
◇  Downloading snippet...
-- ============================================================
-- QUERY 131
-- CHECKPOINT RESULT CONSISTENCY AUDIT
-- READ ONLY
-- ============================================================

select
  cr.id as checkpoint_result_id,
  cr.learner_id,
  cr.checkpoint_id,
  c.title as checkpoint_title,
  cr.status,
  cr.score,
  cr.passed,
  cr.submitted_at,
  cr.graded_at,

  case
    when cr.status = 'pending'
      and cr.passed is null
      and cr.graded_at is null
      then 'OK'

    when cr.status = 'needs_review'
      and cr.passed is null
      and cr.graded_at is null
      then 'OK'

    when cr.status = 'completed'
      and cr.score is not null
      and cr.passed is not null
      and cr.graded_at is not null
      then 'OK'

    when cr.status not in (
      'pending',
      'needs_review',
      'completed'
    )
      then 'ERROR - INVALID STATUS'

    else 'ERROR - INCONSISTENT STATE'
  end as integrity_status

from public.checkpoint_results cr

join public.checkpoints c
  on c.id = cr.checkpoint_id

order by
  cr.learner_id,
  cr.checkpoint_id;
