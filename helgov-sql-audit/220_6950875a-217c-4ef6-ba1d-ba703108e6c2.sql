│
◇  Downloading snippet...
-- ============================================================
-- QUERY 125
-- GET_PROGRAM_PROGRESS LIVE AUDIT
-- READ ONLY
-- ============================================================

select
  pe.id as enrollment_id,
  pe.program_id,
  pe.learner_id,
  pe.status as enrollment_status,
  gp.*
from public.program_enrollments pe
cross join lateral public.get_program_progress(pe.program_id) gp;
