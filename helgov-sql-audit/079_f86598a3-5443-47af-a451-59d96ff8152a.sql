│
◇  Downloading snippet...
SELECT
    qa.id AS attempt_id,
    p.full_name AS learner_name,
    qa.learner_id,
    qa.attempt_number,
    qa.status,
    qa.started_at,
    qa.submitted_at
FROM public.quiz_attempts qa
LEFT JOIN public.profiles p
    ON p.id = qa.learner_id
WHERE qa.quiz_id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'
ORDER BY p.full_name, qa.attempt_number;
