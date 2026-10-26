│
◇  Downloading snippet...
-- Query 330 — Identify Publicly Executable RPC Functions

SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,

    CASE
        WHEN p.prorettype = 'pg_catalog.trigger'::regtype
        THEN 'TRIGGER FUNCTION'
        ELSE 'POTENTIAL RPC'
    END AS function_type,

    CASE
        WHEN EXISTS (
            SELECT 1
            FROM pg_trigger t
            WHERE t.tgfoid = p.oid
              AND NOT t.tgisinternal
        )
        THEN 'USED BY TRIGGER'
        ELSE 'NOT USED BY TRIGGER'
    END AS trigger_usage,

    has_function_privilege(
        'authenticated',
        p.oid,
        'EXECUTE'
    ) AS authenticated_can_execute

FROM pg_proc p

JOIN pg_namespace n
    ON n.oid = p.pronamespace

WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true

ORDER BY
    function_type,
    p.proname;
