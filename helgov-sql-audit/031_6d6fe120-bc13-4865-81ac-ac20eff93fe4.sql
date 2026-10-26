│
◇  Downloading snippet...
-- Query 317 — Inspect Profile Update Permissions

SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND privilege_type = 'UPDATE'
ORDER BY grantee;
