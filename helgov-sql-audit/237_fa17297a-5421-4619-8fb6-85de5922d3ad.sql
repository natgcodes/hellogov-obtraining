│
◇  Downloading snippet...
-- ============================================================
-- QUERY 108
-- INSPECT finalize_checkpoint_quiz_review
--
-- READ ONLY — does not modify anything.
-- ============================================================

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'finalize_checkpoint_quiz_review'
  and pg_get_function_identity_arguments(p.oid)
      = 'target_attempt_id uuid';
