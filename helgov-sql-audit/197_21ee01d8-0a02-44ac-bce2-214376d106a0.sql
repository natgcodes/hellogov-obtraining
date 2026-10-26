│
◇  Downloading snippet...
-- =========================================================
-- QUERY 43
-- GENERAL Q&A — ADD LEARNER GROUP NUMBER
-- =========================================================

alter table public.training_questions
add column if not exists group_number text;

comment on column public.training_questions.group_number is
'Training/onboarding group number provided by the learner when submitting a question.';
