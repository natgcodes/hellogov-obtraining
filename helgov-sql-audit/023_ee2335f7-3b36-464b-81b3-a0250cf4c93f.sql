│
◇  Downloading snippet...
-- Query 325 — Inspect RLS Status Before Applying Account Restrictions

SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    COUNT(p.policyname) AS policy_count
FROM pg_class c
JOIN pg_namespace n
    ON n.oid = c.relnamespace
LEFT JOIN pg_policies p
    ON p.schemaname = n.nspname
   AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
GROUP BY
    c.relname,
    c.relrowsecurity,
    c.relforcerowsecurity
ORDER BY c.relname;
