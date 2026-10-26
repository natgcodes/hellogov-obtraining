│
◇  Downloading snippet...
-- QUERY 275
-- Preview the Customer Journey attempts to cancel.
-- READ ONLY.

SELECT
  qa.id AS attempt_id,
  qa.learner_id,
  qa.attempt_number,
  qa.status,
  qa.score,
  qa.passed,
  qa.submitted_at,
  lqp.completed AS manually_completed
FROM public.quiz_attempts qa
LEFT JOIN public.learner_quiz_progress lqp
  ON lqp.quiz_id = qa.quiz_id
 AND lqp.learner_id = qa.learner_id
WHERE qa.quiz_id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'
ORDER BY qa.attempt_number, qa.started_at;
