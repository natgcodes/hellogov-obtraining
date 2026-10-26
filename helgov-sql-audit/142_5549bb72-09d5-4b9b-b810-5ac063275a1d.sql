│
◇  Downloading snippet...
-- ============================================================
-- QUERY 187
-- Inspect Day 1 Required Completion Items
-- READ ONLY
-- ============================================================

SELECT
  d.day_number,
  d.title AS day_title,
  'module' AS item_type,
  m.id AS item_id,
  m.title AS item_title,
  m.is_required
FROM public.days d
JOIN public.modules m
  ON m.day_id = d.id
WHERE d.day_number = 1
  AND d.is_published = true
  AND m.is_required = true

UNION ALL

SELECT
  d.day_number,
  d.title AS day_title,
  'checkpoint' AS item_type,
  c.id AS item_id,
  c.title AS item_title,
  c.is_required
FROM public.days d
JOIN public.checkpoints c
  ON c.day_id = d.id
WHERE d.day_number = 1
  AND d.is_published = true
  AND c.is_required = true

ORDER BY item_type, item_title;
