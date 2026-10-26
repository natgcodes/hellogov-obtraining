│
◇  Downloading snippet...
-- ============================================================
-- QUERY 120
-- FINAL STATUS INTEGRITY AUDIT
-- READ ONLY
-- ============================================================

select
  'quiz_attempts' as source,
  status,
  count(*) as row_count
from public.quiz_attempts
group by status

union all

select
  'checkpoint_results' as source,
  status,
  count(*) as row_count
from public.checkpoint_results
group by status

union all

select
  'program_enrollments' as source,
  status,
  count(*) as row_count
from public.program_enrollments
group by status

union all

select
  'learner_module_progress' as source,
  status,
  count(*) as row_count
from public.learner_module_progress
group by status

order by source, status;
