│
◇  Downloading snippet...
select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_trainer_learners';
