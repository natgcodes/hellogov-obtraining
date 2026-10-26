│
◇  Downloading snippet...
-- =========================================================
-- 25 — Inspect Quiz Answer Functions
-- =========================================================

select
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'save_quiz_answer',
    'save_multiple_choice_answer',
    'save_matching_answer',
    'save_file_answer',
    'submit_quiz_attempt'
  )
order by p.proname;
