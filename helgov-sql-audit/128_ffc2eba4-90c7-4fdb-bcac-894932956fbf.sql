│
◇  Downloading snippet...
-- ============================================================
-- QUERY 201 — VERIFY TRAINER READ PERMISSIONS
-- READ ONLY
-- ============================================================

SELECT
    t.tablename,
    t.rowsecurity AS rls_enabled,
    p.policyname,
    p.cmd AS operation,
    p.roles,
    p.qual AS using_expression
FROM pg_tables t
LEFT JOIN pg_policies p
    ON p.schemaname = t.schemaname
    AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
      'materials',
      'activities',
      'learner_material_progress',
      'learner_activity_progress'
  )
ORDER BY
    t.tablename,
    p.policyname;
