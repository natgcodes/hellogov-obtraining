│
◇  Downloading snippet...
-- Query 310 — Verify Alexander's Day 2 Test Access

SELECT
    qa.id AS attempt_id,
    qa.status AS attempt_status,
    qa.started_at,
    qa.submitted_at,
    qa.graded_at,
    qa.score,
    qa.passed,
    cr.status AS checkpoint_status,
    cr.completed_at,
    c.allow_learner_completion
FROM public.quiz_attempts qa
JOIN public.checkpoints c
    ON c.quiz_id = qa.quiz_id
LEFT JOIN public.checkpoint_results cr
    ON cr.checkpoint_id = c.id
   AND cr.learner_id = qa.learner_id
WHERE qa.learner_id = '65fb416f-33d8-4587-8b6d-154da9ef9584'
  AND qa.quiz_id = '0112b3b1-5290-46f2-9cf5-30f484a62061';
