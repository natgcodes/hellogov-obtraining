│
◇  Downloading snippet...
-- ============================================================
-- QUERY 134
-- ORPHANED PROGRESS RECORDS AUDIT
-- READ ONLY
-- ============================================================

select
  'learner_setup_progress' as source,
  count(*) as orphaned_records
from public.learner_setup_progress lsp
left join public.setup_items si
  on si.id = lsp.setup_item_id
where si.id is null

union all

select
  'learner_module_progress' as source,
  count(*) as orphaned_records
from public.learner_module_progress lmp
left join public.modules m
  on m.id = lmp.module_id
where m.id is null

union all

select
  'checkpoint_results' as source,
  count(*) as orphaned_records
from public.checkpoint_results cr
left join public.checkpoints c
  on c.id = cr.checkpoint_id
where c.id is null

union all

select
  'quiz_attempts' as source,
  count(*) as orphaned_records
from public.quiz_attempts qa
left join public.quizzes q
  on q.id = qa.quiz_id
where q.id is null

union all

select
  'quiz_answers_attempt' as source,
  count(*) as orphaned_records
from public.quiz_answers a
left join public.quiz_attempts qa
  on qa.id = a.attempt_id
where qa.id is null

union all

select
  'quiz_answers_question' as source,
  count(*) as orphaned_records
from public.quiz_answers a
left join public.quiz_questions qq
  on qq.id = a.question_id
where qq.id is null;
