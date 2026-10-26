│
◇  Downloading snippet...
-- Query 323 — Audit Learner Access Policies

SELECT
    tablename,
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      qual ILIKE '%auth.uid()%'
      OR with_check ILIKE '%auth.uid()%'
      OR qual ILIKE '%is_trainer%'
      OR with_check ILIKE '%is_trainer%'
  )
ORDER BY
    tablename,
    cmd,
    policyname;
