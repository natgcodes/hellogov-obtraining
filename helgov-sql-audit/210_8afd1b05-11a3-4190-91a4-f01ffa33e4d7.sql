│
◇  Downloading snippet...
-- ============================================================
-- QUERY 135
-- FINAL DATABASE INTEGRITY AUDIT
-- READ ONLY
-- ============================================================

with checks as (

  -- Invalid module progress statuses
  select
    'Module progress statuses' as audit_check,
    count(*) filter (
      where status not in ('not_started', 'in_progress', 'completed')
    ) as issues
  from public.learner_module_progress

  union all

  -- Invalid checkpoint result statuses
  select
    'Checkpoint result statuses',
    count(*) filter (
      where status not in ('pending', 'completed', 'needs_review')
    )
  from public.checkpoint_results

  union all

  -- Invalid quiz attempt statuses
  select
    'Quiz attempt statuses',
    count(*) filter (
      where status not in ('in_progress', 'needs_review', 'graded')
    )
  from public.quiz_attempts

  union all

  -- Completed checkpoints without a final pass/fail value
  select
    'Completed checkpoints missing pass/fail',
    count(*)
  from public.checkpoint_results
  where status = 'completed'
    and passed is null

  union all

  -- Pending checkpoints containing final grading data
  select
    'Pending checkpoints with grading data',
    count(*)
  from public.checkpoint_results
  where status = 'pending'
    and (
      score is not null
      or passed is not null
      or graded_at is not null
      or graded_by is not null
    )

  union all

  -- Graded quiz attempts without final pass/fail
  select
    'Graded quizzes missing pass/fail',
    count(*)
  from public.quiz_attempts
  where status = 'graded'
    and passed is null

  union all

  -- Completed module progress without completion timestamp
  select
    'Completed modules missing completed_at',
    count(*)
  from public.learner_module_progress
  where status = 'completed'
    and completed_at is null

  union all

  -- Completed enrollments without completion timestamp
  select
    'Completed enrollments missing completed_at',
    count(*)
  from public.program_enrollments
  where status = 'completed'
    and completed_at is null

)

select
  audit_check,
  issues,
  case
    when issues = 0 then 'PASS'
    else 'REVIEW'
  end as audit_status
from checks
order by audit_check;
