│
◇  Downloading snippet...
SELECT
    d.day_number,
    m.id AS module_id,
    m.title AS module_title,
    q.id AS quiz_id,
    q.title AS quiz_title,
    q.max_attempts,
    q.is_published
FROM public.quizzes q
JOIN public.modules m
    ON m.id = q.module_id
JOIN public.days d
    ON d.id = m.day_id
WHERE d.day_number = 2
  AND m.title ILIKE '%Customer Journey%'
ORDER BY q.title;
