│
◇  Downloading snippet...
-- ============================================================
-- QUERY 72
-- Final Checkpoint & Progress System Verification
-- ============================================================

-- ------------------------------------------------------------
-- 1. FUNCTIONS
-- ------------------------------------------------------------

select
  'FUNCTION' as object_type,
  p.proname as object_name,
  'OK' as status
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'sync_checkpoint_result_from_quiz_attempt',
    'trigger_sync_checkpoint_result',
    'is_day_complete',
    'is_day_unlocked',
    'get_program_progress',
    'recalculate_program_enrollment',
    'trigger_recalculate_enrollment_from_checkpoint',
    'trigger_recalculate_enrollment_from_module',
    'finalize_checkpoint_quiz_review',
    'can_reveal_quiz_answers'
  )

union all

-- ------------------------------------------------------------
-- 2. TRIGGERS
-- ------------------------------------------------------------

select
  'TRIGGER' as object_type,
  t.tgname as object_name,
  'OK' as status
from pg_trigger t
join pg_class c
  on c.oid = t.tgrelid
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal
  and t.tgname in (
    'sync_checkpoint_result_after_attempt_update',
    'recalculate_enrollment_after_checkpoint_change',
    'recalculate_enrollment_after_module_change'
  )

union all

-- ------------------------------------------------------------
-- 3. REQUIRED CHECKPOINT COLUMN
-- ------------------------------------------------------------

select
  'COLUMN' as object_type,
  'checkpoints.is_required' as object_name,
  'OK' as status
from information_schema.columns
where table_schema = 'public'
  and table_name = 'checkpoints'
  and column_name = 'is_required'

order by
  object_type,
  object_name;
