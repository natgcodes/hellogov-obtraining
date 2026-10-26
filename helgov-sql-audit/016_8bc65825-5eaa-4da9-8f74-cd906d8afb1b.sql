│
◇  Downloading snippet...
-- Query 332: Inspect Role Constraints and Access Policies
-- Read-only diagnostic

SELECT
    'CONSTRAINT' AS object_type,
    conrelid::regclass::text AS object_name,
    conname AS rule_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass

UNION ALL

SELECT
    'POLICY' AS object_type,
    schemaname || '.' || tablename AS object_name,
    policyname AS rule_name,
    'USING: ' || COALESCE(qual, 'none') ||
    ' | CHECK: ' || COALESCE(with_check, 'none') AS definition
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      tablename = 'profiles'
      OR policyname ILIKE '%role%'
      OR policyname ILIKE '%trainer%'
      OR policyname ILIKE '%learner%'
  )

ORDER BY object_type, object_name, rule_name;
