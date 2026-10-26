│
◇  Downloading snippet...
SELECT
  q.id,
  q.title,
  q.module_id,
  q.is_published,
  q.is_required,
  q.max_attempts,
  d.day_number,
  c.id AS checkpoint_id
FROM public.quizzes q
LEFT JOIN public.modules m
  ON m.id = q.module_id
LEFT JOIN public.days d
  ON d.id = m.day_id
LEFT JOIN public.checkpoints c
  ON c.quiz_id = q.id
ORDER BY d.day_number NULLS LAST, q.title;
