│
◇  Downloading snippet...
-- ============================================================
-- QUERY 54
-- REVIEW FINALIZATION & CHECKPOINT SYNC DIAGNOSTIC
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
  and p.proname in (
    'grade_manual_quiz_answer',
    'finalize_quiz_review',
    'finalize_quiz_review_with_progress',
    'submit_quiz_attempt',
    'submit_checkpoint',
    'grade_checkpoint_result'
  )
order by p.proname;
