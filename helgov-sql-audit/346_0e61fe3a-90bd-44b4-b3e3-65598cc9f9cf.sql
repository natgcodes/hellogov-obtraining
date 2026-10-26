│
◇  Downloading snippet...
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%customer%';
