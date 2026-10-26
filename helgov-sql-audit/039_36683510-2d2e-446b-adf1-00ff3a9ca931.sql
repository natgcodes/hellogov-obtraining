│
◇  Downloading snippet...
-- Query 309 — Reopen Alexander's Day 2 Test Only

UPDATE public.checkpoint_results
SET
    status = 'pending',
    completed_at = NULL
WHERE learner_id = '65fb416f-33d8-4587-8b6d-154da9ef9584'
  AND checkpoint_id = 'd3fef6a7-59ff-409d-9daa-ef6c107954b3'
  AND status = 'completed'
  AND submitted_at IS NULL
  AND graded_at IS NULL
RETURNING
    learner_id,
    checkpoint_id,
    status,
    completed_at;
