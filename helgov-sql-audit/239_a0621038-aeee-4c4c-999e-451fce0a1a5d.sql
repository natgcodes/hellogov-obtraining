│
◇  Downloading snippet...
-- ============================================================
-- QUERY 106
-- INSPECT "graded" REFERENCES IN FLAGGED FUNCTIONS
--
-- READ ONLY
-- ============================================================

with target_functions as (
  select
    p.oid,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
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

function_lines as (
  select
    tf.function_name,
    tf.arguments,
    line_number,
    line_text
  from target_functions tf
  cross join lateral unnest(
    string_to_array(tf.definition, E'\n')
  ) with ordinality as lines(
    line_text,
    line_number
  )
),

graded_lines as (
  select
    function_name,
    arguments,
    line_number
  from function_lines
  where line_text ilike '%graded%'
)

select
  fl.function_name,
  fl.arguments,
  fl.line_number,
  fl.line_text
from function_lines fl
where exists (
  select 1
  from graded_lines gl
  where gl.function_name = fl.function_name
    and gl.arguments = fl.arguments
    and fl.line_number between
      gl.line_number - 3
      and gl.line_number + 3
)
order by
  fl.function_name,
  fl.arguments,
  fl.line_number;
