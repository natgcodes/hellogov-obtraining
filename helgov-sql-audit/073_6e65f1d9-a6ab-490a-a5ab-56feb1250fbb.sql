│
◇  Downloading snippet...
SELECT
    p.full_name AS learner_name,
    lqp.learner_id,
    lqp.quiz_id,
    lqp.completed,
    lqp.completed_at,
    lqp.updated_at
FROM public.learner_quiz_progress lqp
LEFT JOIN public.profiles p
    ON p.id = lqp.learner_id
WHERE lqp.quiz_id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'
ORDER BY p.full_name;
