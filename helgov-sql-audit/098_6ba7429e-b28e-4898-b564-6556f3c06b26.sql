│
◇  Downloading snippet...
SELECT
    qa.id AS attempt_id,
    q.title AS quiz_title,
    qa.quiz_id,
    qa.attempt_number,
    qa.status,
    qa.score,
    qa.passed,
    qa.started_at,
    qa.submitted_at
FROM quiz_attempts qa
LEFT JOIN quizzes q
    ON q.id = qa.quiz_id
WHERE qa.learner_id = 'b61b252e-aafa-48cb-a4d3-485f513084ec'
ORDER BY qa.started_at DESC;
