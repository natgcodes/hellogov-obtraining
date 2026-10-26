│
◇  Downloading snippet...
-- Query 326 — Protect Deactivated Accounts With Restrictive RLS

DO $$
DECLARE
    target_table record;
BEGIN

    FOR target_table IN
        SELECT
            c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n
            ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relrowsecurity = true
    LOOP

        EXECUTE format(
            'CREATE POLICY "Require active account"
             ON public.%I
             AS RESTRICTIVE
             FOR ALL
             TO authenticated
             USING (public.is_account_active())
             WITH CHECK (public.is_account_active())',
            target_table.table_name
        );

    END LOOP;

END;
$$;
