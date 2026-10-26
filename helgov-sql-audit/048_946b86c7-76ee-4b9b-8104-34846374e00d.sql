│
◇  Downloading snippet...
-- QUERY 279
-- Reset stale module completion for Customer Journey.
-- Only affects the six learners whose module is still completed.
-- Preserves all other progress and historical records.

UPDATE public.learner_module_progress
SET
  status = 'in_progress',
  completed_at = NULL,
  updated_at = now()
WHERE module_id = '9d9b7355-b243-4042-a35b-4bbf80d9f5d9'
  AND status = 'completed'
  AND learner_id IN (
    '023c786f-8311-4a71-8b8c-c1d0efed324a',
    '279d9ed2-8bc0-4afc-b547-79eac28b5061',
    '40899cd1-8451-47d8-a256-3fcbfc99f869',
    '65fb416f-33d8-4587-8b6d-154da9ef9584',
    '896fa6c7-3eda-48e7-a087-d4a2664e5e28',
    'b65b11de-b67e-4333-9a11-d76e4137564d'
  )
RETURNING
  learner_id,
  module_id,
  status,
  completed_at;
