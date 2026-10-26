│
◇  Downloading snippet...
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'finalize_quiz_review',
    'recalculate_module_progress',
    'recalculate_program_enrollment',
    'is_day_complete',
    'is_day_unlocked'
  )
order by p.proname;
