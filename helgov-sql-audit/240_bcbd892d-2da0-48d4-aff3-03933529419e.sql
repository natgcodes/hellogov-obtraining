│
◇  Downloading snippet...
-- ============================================================
-- QUERY 105
-- FINAL STATUS AUDIT
--
-- READ ONLY — does not modify anything.
-- Looks for old/incompatible checkpoint status logic.
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

audit as (
  select
    schema_name,
    function_name,
    arguments,

    -- checkpoint_results using old "graded"
    (
      definition ilike '%checkpoint_results%'
      and (
        definition ilike '%cr.status = ''graded''%'
        or definition ilike '%status = ''graded''%'
      )
    ) as checkpoint_graded_reference,

    -- checkpoint_results using old "submitted"
    (
      definition ilike '%checkpoint_results%'
      and (
        definition ilike '%cr.status = ''submitted''%'
        or definition ilike '%status = ''submitted''%'
      )
    ) as checkpoint_submitted_reference,

    -- expected new states
    (
      definition ilike '%checkpoint_results%'
      and definition ilike '%completed%'
    ) as has_completed_reference,

    (
      definition ilike '%checkpoint_results%'
      and definition ilike '%needs_review%'
    ) as has_needs_review_reference,

    (
      definition ilike '%checkpoint_results%'
      and definition ilike '%pending%'
    ) as has_pending_reference

  from functions
)

select
  schema_name,
  function_name,
  arguments,

  case
    when checkpoint_graded_reference
      then 'CHECK: graded'
    else 'OK'
  end as graded_audit,

  case
    when checkpoint_submitted_reference
      then 'CHECK: submitted'
    else 'OK'
  end as submitted_audit,

  has_completed_reference,
  has_needs_review_reference,
  has_pending_reference

from audit

where
  checkpoint_graded_reference
  or checkpoint_submitted_reference
  or has_completed_reference
  or has_needs_review_reference
  or has_pending_reference

order by
  case
    when checkpoint_graded_reference
      or checkpoint_submitted_reference
    then 0
    else 1
  end,
  function_name,
  arguments;
