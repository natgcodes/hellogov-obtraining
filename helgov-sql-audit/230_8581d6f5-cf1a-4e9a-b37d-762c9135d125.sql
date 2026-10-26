│
◇  Downloading snippet...
-- ============================================================
-- QUERY 115
-- GET CURRENT DEFINITIONS BEFORE STATUS CONSISTENCY FIX
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
  and p.proname in (
    'grade_checkpoint_result',
    'submit_checkpoint'
  )
order by p.proname;
