│
◇  Downloading snippet...
SELECT
    m.title AS module_title,
    q.title AS quiz_title,
    lmp.module_id,
    lmp.status,
    lmp.started_at,
    lmp.completed_at,
    lmp.updated_at
FROM quizzes q
JOIN modules m
    ON m.id = q.module_id
LEFT JOIN learner_module_progress lmp
    ON lmp.module_id = m.id
    AND lmp.learner_id = 'b61b252e-aafa-48cb-a4d3-485f513084ec'
WHERE q.id = 'ee23da64-0555-4a4d-855f-30ead2e06f04';
