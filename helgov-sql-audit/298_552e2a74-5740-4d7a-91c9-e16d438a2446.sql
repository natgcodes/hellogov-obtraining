│
◇  Downloading snippet...
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_quiz_review_queue',
    'is_day_complete',
    'is_day_unlocked',
    'get_program_progress'
  )
order by p.proname;
