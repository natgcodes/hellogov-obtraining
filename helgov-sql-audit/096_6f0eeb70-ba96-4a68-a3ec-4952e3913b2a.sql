│
◇  Downloading snippet...
SELECT
    lqp.id,
    q.title AS quiz_title,
    lqp.quiz_id,
    lqp.completed,
    lqp.completed_at,
    lqp.created_at,
    lqp.updated_at
FROM learner_quiz_progress lqp
JOIN quizzes q
    ON q.id = lqp.quiz_id
WHERE lqp.learner_id = 'b61b252e-aafa-48cb-a4d3-485f513084ec'
ORDER BY lqp.updated_at DESC;
