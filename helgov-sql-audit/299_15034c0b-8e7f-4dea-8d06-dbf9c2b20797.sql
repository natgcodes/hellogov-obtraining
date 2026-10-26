│
◇  Downloading snippet...
-- ============================================================
-- QUERY 43
-- CHECKPOINT REVIEW, PROGRESS & DAY COMPLETION DIAGNOSTIC
-- ============================================================

-- ------------------------------------------------------------
-- 1. Relevant table columns
-- ------------------------------------------------------------

select
  'TABLE_COLUMNS' as section,
  c.table_name as object_name,
  c.column_name as detail_1,
  c.data_type as detail_2,
  c.column_default::text as detail_3
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'checkpoint_results',
    'checkpoints',
    'quiz_attempts',
    'quiz_answers',
    'quizzes',
    'quiz_questions',
    'learner_module_progress',
    'learner_material_progress',
    'learner_activity_progress',
    'days',
    'modules'
  )

union all

-- ------------------------------------------------------------
-- 2. Relevant functions
-- ------------------------------------------------------------

select
  'FUNCTION' as section,
  p.proname as object_name,
  pg_get_function_identity_arguments(p.oid) as detail_1,
  pg_get_function_result(p.oid) as detail_2,
  pg_get_functiondef(p.oid) as detail_3
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname ilike '%quiz%'
    or p.proname ilike '%checkpoint%'
    or p.proname ilike '%progress%'
    or p.proname ilike '%complete%'
    or p.proname ilike '%unlock%'
    or p.proname ilike '%review%'
    or p.proname ilike '%grade%'
  )

union all

-- ------------------------------------------------------------
-- 3. Triggers on relevant tables
-- ------------------------------------------------------------

select
  'TRIGGER' as section,
  event_object_table as object_name,
  trigger_name as detail_1,
  action_timing as detail_2,
  action_statement as detail_3
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'checkpoint_results',
    'checkpoints',
    'quiz_attempts',
    'quiz_answers',
    'learner_module_progress',
    'learner_material_progress',
    'learner_activity_progress'
  )

order by
  section,
  object_name,
  detail_1;
