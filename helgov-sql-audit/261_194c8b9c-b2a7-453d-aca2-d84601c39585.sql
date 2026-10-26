│
◇  Downloading snippet...
-- ============================================================
-- QUERY 88
-- TRAINER / LEARNER TRACKING — RPC VALIDATION
--
-- Validates the backend objects created for the trainer
-- learner roster and individual learner profile.
-- ============================================================

with expected_functions as (

  select
    'get_trainer_learners'::text as function_name,
    'uuid'::text as expected_arguments

  union all

  select
    'get_trainer_learner_summary',
    'uuid, uuid'

  union all

  select
    'get_trainer_learner_assessments',
    'uuid, uuid'

  union all

  select
    'get_trainer_learner_checkpoints',
    'uuid, uuid'

  union all

  select
    'get_trainer_learner_attempt_history',
    'uuid, uuid'

  union all

  select
    'get_trainer_learner_activity',
    'uuid, uuid'
),

function_status as (

  select
    ef.function_name,
    ef.expected_arguments,

    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = ef.function_name
          and pg_get_function_identity_arguments(p.oid)
              = ef.expected_arguments
      )
      then 'OK'
      else 'MISSING'
    end as status

  from expected_functions ef
),

roster_return_columns as (

  select
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'get_trainer_learners'
          and pg_get_function_identity_arguments(p.oid) = 'uuid'
          and pg_get_function_result(p.oid)
              ilike '%completed_checkpoints%'
          and pg_get_function_result(p.oid)
              ilike '%total_checkpoints%'
      )
      then 'OK'
      else 'MISSING'
    end as status
)

select
  'FUNCTION'::text as object_type,
  fs.function_name as object_name,
  fs.status

from function_status fs

union all

select
  'RETURN COLUMNS'::text,
  'get_trainer_learners checkpoint columns',
  rrc.status

from roster_return_columns rrc

order by
  object_type,
  object_name;
