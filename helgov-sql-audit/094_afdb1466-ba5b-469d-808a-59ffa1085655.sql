│
◇  Downloading snippet...
SELECT
    q.id AS quiz_id,
    q.title AS quiz_title,
    q.module_id,
    m.title AS module_title,
    c.id AS checkpoint_id,
    c.title AS checkpoint_title,
    c.day_id
FROM quizzes q
LEFT JOIN modules m
    ON m.id = q.module_id
LEFT JOIN checkpoints c
    ON c.quiz_id = q.id
WHERE q.id = 'ee23da64-0555-4a4d-855f-30ead2e06f04';
