│
◇  Downloading snippet...
SELECT
    cr.id,
    c.title AS checkpoint_title,
    cr.learner_id,
    cr.status,
    cr.score,
    cr.passed,
    cr.completed_at,
    cr.submitted_at,
    cr.graded_at
FROM checkpoint_results cr
JOIN checkpoints c
    ON c.id = cr.checkpoint_id
WHERE cr.learner_id = 'b61b252e-aafa-48cb-a4d3-485f513084ec'
  AND cr.checkpoint_id = '8c7bb962-59fa-42ce-95bd-3f1a772472f0';
