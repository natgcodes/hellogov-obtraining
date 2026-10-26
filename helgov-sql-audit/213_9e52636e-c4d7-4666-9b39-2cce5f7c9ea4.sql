│
◇  Downloading snippet...
-- ============================================================
-- QUERY 132
-- QUIZ ATTEMPT CONSISTENCY AUDIT
-- READ ONLY
-- ============================================================

select
  qa.id as attempt_id,
  qa.learner_id,
  qa.quiz_id,
  qa.status,
  qa.score,
  qa.passed,
  qa.submitted_at,
  qa.graded_at,

  case
    when qa.status = 'in_progress'
      and qa.submitted_at is null
      and qa.graded_at is null
      and qa.passed is null
      then 'OK'

    when qa.status = 'needs_review'
      and qa.submitted_at is not null
      and qa.graded_at is null
      and qa.passed is null
      then 'OK'

    when qa.status = 'graded'
      and qa.submitted_at is not null
      and qa.graded_at is not null
      and qa.score is not null
      and qa.passed is not null
      then 'OK'

    when qa.status not in (
      'in_progress',
      'needs_review',
      'graded'
    )
      then 'ERROR - INVALID STATUS'

    else 'ERROR - INCONSISTENT STATE'
  end as integrity_status

from public.quiz_attempts qa

order by
  qa.learner_id,
  qa.quiz_id,
  qa.id;
