│
◇  Downloading snippet...
-- ============================================================
-- QUERY 89
-- FINAL QA — TRAINER / LEARNER TRACKING BLOCK
--
-- Final structural health check before UI integration.
-- ============================================================

with checks as (

  -- ==========================================================
  -- CORE TABLES
  -- ==========================================================

  select
    1 as sort_order,
    'TABLE'::text as object_type,
    'program_enrollments'::text as object_name,
    case
      when to_regclass('public.program_enrollments') is not null
      then 'OK'
      else 'MISSING'
    end as status

  union all

  select
    2,
    'TABLE',
    'learner_module_progress',
    case
      when to_regclass('public.learner_module_progress') is not null
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    3,
    'TABLE',
    'quiz_attempts',
    case
      when to_regclass('public.quiz_attempts') is not null
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    4,
    'TABLE',
    'checkpoint_results',
    case
      when to_regclass('public.checkpoint_results') is not null
      then 'OK'
      else 'MISSING'
    end

  -- ==========================================================
  -- CHECKPOINT STRUCTURE
  -- ==========================================================

  union all

  select
    5,
    'COLUMN',
    'checkpoints.quiz_id',
    case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'checkpoints'
          and column_name = 'quiz_id'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    6,
    'COLUMN',
    'checkpoints.is_required',
    case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'checkpoints'
          and column_name = 'is_required'
      )
      then 'OK'
      else 'MISSING'
    end

  -- ==========================================================
  -- LEARNER PROGRESS FUNCTIONS
  -- ==========================================================

  union all

  select
    7,
    'FUNCTION',
    'get_program_progress',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'get_program_progress'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    8,
    'FUNCTION',
    'is_day_complete',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'is_day_complete'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    9,
    'FUNCTION',
    'is_day_unlocked',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'is_day_unlocked'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    10,
    'FUNCTION',
    'recalculate_program_enrollment',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'recalculate_program_enrollment'
      )
      then 'OK'
      else 'MISSING'
    end

  -- ==========================================================
  -- QUIZ / CHECKPOINT REVIEW
  -- ==========================================================

  union all

  select
    11,
    'FUNCTION',
    'grade_manual_quiz_answer',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'grade_manual_quiz_answer'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    12,
    'FUNCTION',
    'finalize_quiz_review_with_progress',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'finalize_quiz_review_with_progress'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    13,
    'FUNCTION',
    'sync_checkpoint_result_from_quiz_attempt',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'sync_checkpoint_result_from_quiz_attempt'
      )
      then 'OK'
      else 'MISSING'
    end

  -- ==========================================================
  -- TRAINER TRACKING RPCs
  -- ==========================================================

  union all

  select
    14,
    'FUNCTION',
    'get_trainer_learners',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'get_trainer_learners'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    15,
    'FUNCTION',
    'get_trainer_learner_summary',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'get_trainer_learner_summary'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    16,
    'FUNCTION',
    'get_trainer_learner_assessments',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'get_trainer_learner_assessments'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    17,
    'FUNCTION',
    'get_trainer_learner_checkpoints',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'get_trainer_learner_checkpoints'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    18,
    'FUNCTION',
    'get_trainer_learner_attempt_history',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'get_trainer_learner_attempt_history'
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    19,
    'FUNCTION',
    'get_trainer_learner_activity',
    case
      when exists (
        select 1
        from pg_proc p
        join pg_namespace n
          on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'get_trainer_learner_activity'
      )
      then 'OK'
      else 'MISSING'
    end

  -- ==========================================================
  -- AUTOMATION TRIGGERS
  -- ==========================================================

  union all

  select
    20,
    'TRIGGER',
    'sync_checkpoint_result_after_attempt_update',
    case
      when exists (
        select 1
        from pg_trigger
        where tgname =
          'sync_checkpoint_result_after_attempt_update'
          and not tgisinternal
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    21,
    'TRIGGER',
    'recalculate_enrollment_after_checkpoint_change',
    case
      when exists (
        select 1
        from pg_trigger
        where tgname =
          'recalculate_enrollment_after_checkpoint_change'
          and not tgisinternal
      )
      then 'OK'
      else 'MISSING'
    end

  union all

  select
    22,
    'TRIGGER',
    'recalculate_enrollment_after_module_change',
    case
      when exists (
        select 1
        from pg_trigger
        where tgname =
          'recalculate_enrollment_after_module_change'
          and not tgisinternal
      )
      then 'OK'
      else 'MISSING'
    end
)

select
  object_type,
  object_name,
  status
from checks
order by sort_order;
