│
◇  Downloading snippet...
-- ============================================================
-- QUERY 200 — MATERIAL AND ACTIVITY PROGRESS STRUCTURE
-- READ ONLY
-- ============================================================

SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'materials',
      'activities',
      'learner_material_progress',
      'learner_activity_progress'
  )
ORDER BY
    table_name,
    ordinal_position;
