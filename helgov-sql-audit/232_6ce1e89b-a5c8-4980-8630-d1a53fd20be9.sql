│
◇  Downloading snippet...
-- ============================================================
-- QUERY 113
-- GLOBAL AUDIT
-- Find functions that may still WRITE "graded"
-- into checkpoint_results.status
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
    and p.prokind = 'f'
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
    when definition ~* 
      'checkpoint_results[\s\S]{0,1500}status\s*=\s*''graded'''
      then 'CHECK'

    when definition ~*
      'checkpoint_results[\s\S]{0,1500}''graded'''
      then 'REVIEW'

    else 'OK'
  end as checkpoint_graded_write_audit

from checkpoint_functions

order by
  case
    when definition ~*
      'checkpoint_results[\s\S]{0,1500}status\s*=\s*''graded'''
      then 1
    when definition ~*
      'checkpoint_results[\s\S]{0,1500}''graded'''
      then 2
    else 3
  end,
  function_name;
