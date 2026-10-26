│
◇  Downloading snippet...
-- QUERY 278
-- Inspect current module progress for affected learners.
-- READ ONLY.

SELECT
  qa.learner_id,
  qa.status AS original_attempt_status,
  lmp.status AS module_status,
  lmp.completed_at AS module_completed_at,
  pe.status AS enrollment_status
FROM public.quiz_attempts qa

LEFT JOIN public.learner_module_progress lmp
  ON lmp.learner_id = qa.learner_id
 AND lmp.module_id = '9d9b7355-b243-4042-a35b-4bbf80d9f5d9'

LEFT JOIN public.program_enrollments pe
  ON pe.learner_id = qa.learner_id
 AND pe.program_id = '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0'

WHERE qa.quiz_id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'
  AND qa.attempt_number = 1

ORDER BY qa.learner_id;
