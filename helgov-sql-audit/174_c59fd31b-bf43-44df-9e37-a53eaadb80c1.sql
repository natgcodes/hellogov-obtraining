│
◇  Downloading snippet...
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%day_complete%'
    or p.proname ilike '%day_completion%'
    or p.proname ilike '%journey%'
    or p.proname ilike '%unlock%'
    or p.proname ilike '%program_progress%'
  )
order by p.proname;
