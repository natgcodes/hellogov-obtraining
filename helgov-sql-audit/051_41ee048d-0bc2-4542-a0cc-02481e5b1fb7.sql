│
◇  Downloading snippet...
-- QUERY 276
-- Cancel the 8 original Customer Journey attempts.
-- Preserve answers, scores and historical information.
-- Does not modify manual completion flags yet.

UPDATE public.quiz_attempts
SET status = 'cancelled'
WHERE quiz_id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'
  AND attempt_number = 1
  AND status IN ('needs_review', 'in_progress')
  AND id IN (
    '4e5475f5-bc31-4cd0-a1b6-78aa7317be90',
    '1b56ff09-e608-42f0-9e60-dbe4c512f9ab',
    '5e9e132a-bb48-45bb-aea9-21c906aa4306',
    '8a2c6080-2e4a-4679-8e57-4f08a021cffc',
    '919e8f56-ba8c-4b72-832f-f36dc159dec9',
    'e61e91b3-229d-4c60-a254-885c502ac4a3',
    'd82fc1c1-3427-49d6-bca5-b7788a68fba5',
    '4d58d4ac-937a-4f2c-9c61-e9d3beb7434b'
  )
RETURNING
  id AS attempt_id,
  learner_id,
  attempt_number,
  status,
  score;
