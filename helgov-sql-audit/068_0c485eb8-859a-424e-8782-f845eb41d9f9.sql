│
◇  Downloading snippet...
-- QUERY 259
-- Review existing attempts and manual completion.
-- Read-only: does not modify any data.

SELECT
  p.full_name AS learner_name,
  qa.attempt_number,
  qa.status AS attempt_status,
  qa.score,
  qa.passed,
  COALESCE(lqp.completed, false) AS manually_completed
FROM public.quiz_attempts qa
JOIN public.profiles p
  ON p.id = qa.learner_id
LEFT JOIN public.learner_quiz_progress lqp
  ON lqp.learner_id = qa.learner_id
  AND lqp.quiz_id = qa.quiz_id
WHERE qa.quiz_id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'
ORDER BY
  p.full_name,
  qa.attempt_number;
