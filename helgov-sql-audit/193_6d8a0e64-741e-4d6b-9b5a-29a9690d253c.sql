│
◇  Downloading snippet...
-- QUERY 45 — Inspect Learner Day Progress Function

select
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_learner_day_progress';
