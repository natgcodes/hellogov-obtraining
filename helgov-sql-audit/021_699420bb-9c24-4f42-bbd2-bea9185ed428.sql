│
◇  Downloading snippet...
-- Query 327 — Verify Account Access Policies

SELECT
    tablename,
    policyname,
    permissive,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'Require active account'
ORDER BY tablename;
