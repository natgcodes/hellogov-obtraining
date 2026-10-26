│
◇  Downloading snippet...
-- ============================================================
-- QUERY 117
-- GLOBAL CHECKPOINT_RESULTS STATUS AUDIT
--
-- Valid checkpoint_results statuses:
--   pending
--   completed
--   needs_review
--
-- This query does NOT modify anything.
-- ============================================================

with functions as (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
),

checkpoint_functions as (
  select *
  from functions
  where definition ilike '%checkpoint_results%'
)

select
  schema_name,
  function_name,
  arguments,

  case
    when definition ilike '%checkpoint_results%'
    then 'YES'
    else 'NO'
  end as touches_checkpoint_results,

  case
    when definition like '%status = ''submitted''%'
      or definition like '%''submitted'',%'
      or definition like '%, ''submitted''%'
    then 'FOUND'
    else 'NO'
  end as submitted_reference,

  case
    when definition like '%status = ''graded''%'
      or definition like '%''graded'',%'
      or definition like '%, ''graded''%'
    then 'FOUND'
    else 'NO'
  end as graded_reference,

  case
    when definition like '%status = ''pending''%'
      or definition like '%''pending'',%'
      or definition like '%, ''pending''%'
    then 'FOUND'
    else 'NO'
  end as pending_reference,

  case
    when definition like '%status = ''completed''%'
      or definition like '%''completed'',%'
      or definition like '%, ''completed''%'
    then 'FOUND'
    else 'NO'
  end as completed_reference,

  case
    when definition like '%status = ''needs_review''%'
      or definition like '%''needs_review'',%'
      or definition like '%, ''needs_review''%'
    then 'FOUND'
    else 'NO'
  end as needs_review_reference

from checkpoint_functions
order by function_name, arguments;
