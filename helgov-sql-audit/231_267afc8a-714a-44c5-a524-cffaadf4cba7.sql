│
◇  Downloading snippet...
-- ============================================================
-- QUERY 114
-- CONTEXT AUDIT FOR "graded"
--
-- Shows each line containing "graded" plus nearby lines,
-- so we can determine whether it belongs to:
--   quiz_attempts       -> graded is VALID
--   checkpoint_results  -> graded is INVALID
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
    and p.prokind = 'f'
    and pg_get_functiondef(p.oid) ilike '%checkpoint_results%'
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
  ) with ordinality as lines(line_text, line_number)
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
  gl.line_number as graded_line,
  fl.line_number as context_line,
  fl.line_text

from graded_lines gl

join function_lines fl
  on fl.function_name = gl.function_name
  and fl.arguments = gl.arguments
  and fl.line_number between
      greatest(gl.line_number - 4, 1)
      and gl.line_number + 4

order by
  fl.function_name,
  gl.line_number,
  fl.line_number;
