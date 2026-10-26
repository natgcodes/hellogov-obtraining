│
◇  Downloading snippet...
-- QUERY 277
-- Reset manual completion for Customer Journey only.
-- Does not delete attempts, answers or scores.

UPDATE public.learner_quiz_progress
SET completed = false
WHERE quiz_id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'
  AND completed = true
  AND learner_id IN (
    '023c786f-8311-4a71-8b8c-c1d0efed324a',
    '40899cd1-8451-47d8-a256-3fcbfc99f869',
    '279d9ed2-8bc0-4afc-b547-79eac28b5061',
    '896fa6c7-3eda-48e7-a087-d4a2664e5e28',
    'b65b11de-b67e-4333-9a11-d76e4137564d',
    '65fb416f-33d8-4587-8b6d-154da9ef9584'
  )
RETURNING
  learner_id,
  quiz_id,
  completed;
