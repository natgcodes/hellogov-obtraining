│
◇  Downloading snippet...
-- ============================================================
-- QUERY 101
-- Inspect functions flagged by Query 100
--
-- Diagnostic only.
-- Does NOT modify anything.
-- ============================================================

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as function_definition

from pg_proc p

join pg_namespace n
  on n.oid = p.pronamespace

where n.nspname = 'public'
  and p.prokind = 'f'

  and p.proname in (
    'finalize_quiz_review_with_progress',
    'get_program_progress',
    'get_trainer_learner_activity',
    'get_trainer_learner_checkpoints',
    'get_trainer_learner_day_progress',
    'get_trainer_learner_detail',
    'get_trainer_learners',
    'is_day_complete'
  )

order by
  p.proname,
  pg_get_function_identity_arguments(p.oid);
