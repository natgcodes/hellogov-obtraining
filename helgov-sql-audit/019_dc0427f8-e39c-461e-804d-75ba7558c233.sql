│
◇  Downloading snippet...
-- Query 329 — Audit Active Account Checks in Security Definer Functions

SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,

    CASE
        WHEN pg_get_functiondef(p.oid) ILIKE '%is_account_active%'
          OR pg_get_functiondef(p.oid) ILIKE '%account_status%'
        THEN 'HAS ACCOUNT STATUS CHECK'
        ELSE 'NO EXPLICIT ACCOUNT STATUS CHECK'
    END AS account_security_status

FROM pg_proc p

JOIN pg_namespace n
    ON n.oid = p.pronamespace

WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true
  AND has_function_privilege(
      'authenticated',
      p.oid,
      'EXECUTE'
  )

ORDER BY
    account_security_status DESC,
    p.proname;
