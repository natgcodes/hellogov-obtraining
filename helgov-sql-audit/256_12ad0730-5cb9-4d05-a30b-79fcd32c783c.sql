│
◇  Downloading snippet...
-- ============================================================
-- QUERY 91
-- Inspect get_trainer_learner_assessments
--
-- Diagnostic only.
-- Shows the current function definition and return structure.
-- ============================================================

select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  pg_get_functiondef(p.oid) as function_definition

from pg_proc p

join pg_namespace n
  on n.oid = p.pronamespace

where n.nspname = 'public'
  and p.proname = 'get_trainer_learner_assessments';
