│
◇  Downloading snippet...
SELECT
  qa.id AS attempt_id,
  qa.learner_id,
  p.full_name AS learner_name,
  q.title AS quiz_title,
  qa.quiz_id,
  qa.attempt_number,
  qa.status,
  qa.passed,
  qa.created_at
FROM public.quiz_attempts qa
JOIN public.profiles p
  ON p.id = qa.learner_id
JOIN public.quizzes q
  ON q.id = qa.quiz_id
WHERE qa.status = 'needs_review'
ORDER BY p.full_name, q.title, qa.attempt_number;
