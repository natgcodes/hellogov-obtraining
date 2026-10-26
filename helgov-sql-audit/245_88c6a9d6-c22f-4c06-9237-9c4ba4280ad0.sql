│
◇  Downloading snippet...
-- ============================================================
-- QUERY 100
-- Audit checkpoint_results status usage
-- ============================================================

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,

  case
    when pg_get_functiondef(p.oid) ilike '%checkpoint_results%'
     and pg_get_functiondef(p.oid) ilike '%graded%'
    then 'CHECK'
    else 'OK'
  end as status

from pg_proc p

join pg_namespace n
  on n.oid = p.pronamespace

where n.nspname = 'public'
  and pg_get_functiondef(p.oid) ilike '%checkpoint_results%'

order by
  p.proname,
  pg_get_function_identity_arguments(p.oid);
