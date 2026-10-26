│
◇  Downloading snippet...
-- ============================================================
-- QUERY 189
-- Inspect Day 1 Checkpoint Types and Results
-- READ ONLY
-- ============================================================

SELECT
  d.day_number,
  c.title AS checkpoint_title,
  c.checkpoint_type,
  c.is_required,
  cr.status AS recorded_status,
  cr.passed,
  CASE
    WHEN cr.status IS DISTINCT FROM 'completed'
      THEN 'NOT COMPLETED'

    WHEN c.checkpoint_type = 'assessment'
      AND cr.passed IS DISTINCT FROM true
      THEN 'BLOCKED - ASSESSMENT NOT PASSED'

    WHEN c.checkpoint_type IN (
      'trainer_session',
      'information'
    )
      THEN 'SATISFIED'

    WHEN c.checkpoint_type = 'assessment'
      AND cr.passed = true
      THEN 'SATISFIED'

    ELSE 'CHECK CONFIGURATION'
  END AS unlock_requirement

FROM public.days d

JOIN public.checkpoints c
  ON c.day_id = d.id

LEFT JOIN public.checkpoint_results cr
  ON cr.checkpoint_id = c.id
  AND cr.learner_id =
    '06ec7963-c338-45bd-8eb6-43de0134c281'::uuid

WHERE d.day_number = 1
  AND d.is_published = true
  AND c.is_required = true

ORDER BY c.title;
