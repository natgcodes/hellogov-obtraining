│
◇  Downloading snippet...
-- ============================================================
-- QUERY 173
-- Inspect Checkpoint and Quiz Relationships
-- ============================================================

SELECT
  c.id AS checkpoint_id,
  c.quiz_id,
  q.title AS quiz_title,
  c.day_id,
  d.program_id,
  q.module_id
FROM public.checkpoints c
JOIN public.quizzes q
  ON q.id = c.quiz_id
JOIN public.days d
  ON d.id = c.day_id
ORDER BY d.day_number, q.title;
