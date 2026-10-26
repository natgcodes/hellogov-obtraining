│
◇  Downloading snippet...
select
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_program_progress',
    'get_learner_journey_days'
  )
order by p.proname;
