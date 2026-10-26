│
◇  Downloading snippet...
-- Query 322 — Require Active Account for Trainer Authorization

CREATE OR REPLACE FUNCTION public.is_trainer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'trainer'
          AND account_status = 'active'
    );

$function$;
