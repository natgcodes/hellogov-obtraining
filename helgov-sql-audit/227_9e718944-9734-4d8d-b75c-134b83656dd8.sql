│
◇  Downloading snippet...
-- ============================================================
-- QUERY 118
-- INSPECT REMAINING "graded" REFERENCES
-- READ ONLY
-- ============================================================

with functions as (
  select
    p.oid,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and p.proname in (
      'finalize_checkpoint_quiz_review',
      'finalize_quiz_review_with_progress',
      'get_trainer_learner_activity',
      'get_trainer_learner_day_progress',
      'get_trainer_learner_detail',
      'get_trainer_learners',
      'sync_checkpoint_result_from_quiz_attempt'
    )
),

lines as (
  select
    f.function_name,
    f.arguments,
    x.line_number,
    x.line_text
  from functions f
  cross join lateral unnest(
    string_to_array(f.definition, E'\n')
  ) with ordinality as x(line_text, line_number)
)

select
  function_name,
  arguments,
  line_number,
  trim(line_text) as line_text
from lines
where lower(line_text) like '%graded%'
   or lower(line_text) like '%checkpoint_results%'
   or lower(line_text) like '%quiz_attempts%'
order by
  function_name,
  line_number;
