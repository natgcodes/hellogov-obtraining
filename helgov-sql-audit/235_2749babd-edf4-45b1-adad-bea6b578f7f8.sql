│
◇  Downloading snippet...
-- ============================================================
-- QUERY 110
-- AUDIT finalize_checkpoint_quiz_review STATUS VOCABULARY
-- ============================================================

with fn as (
  select
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'finalize_checkpoint_quiz_review'
    and pg_get_function_identity_arguments(p.oid)
        = 'target_attempt_id uuid'
)

select
  case
    when definition like '%status = ''graded''%'
      then 'OK'
    else 'CHECK'
  end as quiz_attempt_status,

  case
    when definition like '%''completed''::text%'
      then 'OK'
    else 'CHECK'
  end as checkpoint_return_status,

  case
    when definition like '%''graded''::text,%''graded''::text%'
      then 'CHECK - OLD RETURN STILL PRESENT'
    else 'OK'
  end as old_return_removed

from fn;
