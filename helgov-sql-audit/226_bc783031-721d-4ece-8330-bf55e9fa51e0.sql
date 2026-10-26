│
◇  Downloading snippet...
-- ============================================================
-- QUERY 119
-- CHECKPOINT_RESULTS BLOCK CONTEXT AUDIT
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

function_lines as (
  select
    f.function_name,
    f.arguments,
    x.line_number,
    x.line_text
  from functions f
  cross join lateral unnest(
    string_to_array(f.definition, E'\n')
  ) with ordinality as x(line_text, line_number)
),

checkpoint_locations as (
  select
    function_name,
    arguments,
    line_number as checkpoint_line
  from function_lines
  where lower(line_text) like '%checkpoint_results%'
),

context_lines as (
  select distinct
    fl.function_name,
    fl.arguments,
    cl.checkpoint_line,
    fl.line_number,
    trim(fl.line_text) as line_text
  from checkpoint_locations cl
  join function_lines fl
    on fl.function_name = cl.function_name
   and fl.arguments = cl.arguments
   and fl.line_number between
       greatest(cl.checkpoint_line - 5, 1)
       and cl.checkpoint_line + 20
)

select
  function_name,
  arguments,
  checkpoint_line,
  line_number,
  line_text
from context_lines
order by
  function_name,
  checkpoint_line,
  line_number;
