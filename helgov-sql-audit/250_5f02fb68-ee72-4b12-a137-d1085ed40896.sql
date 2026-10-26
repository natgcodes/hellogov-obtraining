│
◇  Downloading snippet...
-- ============================================================
-- QUERY 96A
-- Inspect checkpoint_results status constraint
--
-- Diagnostic only.
-- Does not modify any data.
-- ============================================================

select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class rel
  on rel.oid = con.conrelid
join pg_namespace nsp
  on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'checkpoint_results'
  and con.conname = 'checkpoint_results_status_check';
