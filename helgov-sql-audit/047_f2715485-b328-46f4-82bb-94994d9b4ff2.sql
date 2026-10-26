│
◇  Downloading snippet...
-- QUERY 280
-- Final verification of Customer Journey retakes.
-- READ ONLY.

SELECT
  qa.learner_id,
  COUNT(*) AS total_attempts,
  COUNT(*) FILTER (
    WHERE qa.status = 'cancelled'
  ) AS cancelled_attempts,
  COUNT(*) FILTER (
    WHERE qa.status <> 'cancelled'
  ) AS active_attempts,
  MAX(qa.attempt_number) AS last_attempt_number,
  q.max_attempts,
  COUNT(*) < q.max_attempts AS can_start_new_attempt,
  lmp.status AS module_status,
  COALESCE(lqp.completed, false) AS manually_completed

FROM public.quiz_attempts qa

JOIN public.quizzes q
  ON q.id = qa.quiz_id

LEFT JOIN public.learner_module_progress lmp
  ON lmp.learner_id = qa.learner_id
 AND lmp.module_id = q.module_id

LEFT JOIN public.learner_quiz_progress lqp
  ON lqp.learner_id = qa.learner_id
 AND lqp.quiz_id = qa.quiz_id

WHERE qa.quiz_id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'

GROUP BY
  qa.learner_id,
  q.max_attempts,
  lmp.status,
  lqp.completed

ORDER BY qa.learner_id;
