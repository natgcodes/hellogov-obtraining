│
◇  Downloading snippet...
-- ============================================================
-- QUERY 188
-- Diagnose Learner Day 1 Completion
-- READ ONLY
-- ============================================================

WITH target_learner AS (
  SELECT
    '06ec7963-c338-45bd-8eb6-43de0134c281'::uuid AS learner_id
),

required_modules AS (
  SELECT
    d.day_number,
    'module'::text AS item_type,
    m.title AS item_title,
    m.id AS item_id,
    lmp.status::text AS recorded_status,
    NULL::boolean AS passed
  FROM public.days d
  JOIN public.modules m
    ON m.day_id = d.id
  CROSS JOIN target_learner tl
  LEFT JOIN public.learner_module_progress lmp
    ON lmp.module_id = m.id
    AND lmp.learner_id = tl.learner_id
  WHERE d.program_id = 'REPLACE_WITH_PROGRAM_UUID'::uuid
    AND d.day_number = 1
    AND d.is_published = true
    AND m.is_required = true
),

required_checkpoints AS (
  SELECT
    d.day_number,
    'checkpoint'::text AS item_type,
    c.title AS item_title,
    c.id AS item_id,
    cr.status::text AS recorded_status,
    cr.passed
  FROM public.days d
  JOIN public.checkpoints c
    ON c.day_id = d.id
  CROSS JOIN target_learner tl
  LEFT JOIN public.checkpoint_results cr
    ON cr.checkpoint_id = c.id
    AND cr.learner_id = tl.learner_id
  WHERE d.program_id = 'REPLACE_WITH_PROGRAM_UUID'::uuid
    AND d.day_number = 1
    AND d.is_published = true
    AND c.is_required = true
)

SELECT *
FROM required_modules

UNION ALL

SELECT *
FROM required_checkpoints

ORDER BY item_type, item_title;
