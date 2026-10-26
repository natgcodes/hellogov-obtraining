│
◇  Downloading snippet...
UPDATE checkpoint_results
SET
    status = 'pending',
    completed_at = NULL
WHERE id = '27076718-f4c9-41b7-8f6d-e4b049c2ae99'
  AND learner_id = 'b61b252e-aafa-48cb-a4d3-485f513084ec'
  AND checkpoint_id = '8c7bb962-59fa-42ce-95bd-3f1a772472f0'
  AND status = 'completed'
  AND submitted_at IS NULL
  AND graded_at IS NULL
RETURNING
    id,
    status,
    completed_at,
    submitted_at;
