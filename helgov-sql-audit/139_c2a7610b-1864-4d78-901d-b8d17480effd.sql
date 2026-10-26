│
◇  Downloading snippet...
-- ============================================================
-- QUERY 190
-- Inspect Day 1 Assessment Configuration
-- READ ONLY
-- ============================================================

SELECT
  c.id AS checkpoint_id,
  c.title AS checkpoint_title,
  c.checkpoint_type,
  c.is_required,
  c.quiz_id,
  cr.status AS checkpoint_status,
  cr.passed AS checkpoint_passed

FROM public.checkpoints c

LEFT JOIN public.checkpoint_results cr
  ON cr.checkpoint_id = c.id
  AND cr.learner_id =
    '06ec7963-c338-45bd-8eb6-43de0134c281'::uuid

WHERE c.id =
  '8c7bb962-59fa-42ce-95bd-3f1a772472f0'::uuid;
