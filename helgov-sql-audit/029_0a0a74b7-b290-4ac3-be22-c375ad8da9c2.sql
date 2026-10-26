│
◇  Downloading snippet...
-- Query 319 — Protect Account Deactivation Fields

CREATE OR REPLACE FUNCTION public.protect_account_status_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN

    IF (
        NEW.account_status IS DISTINCT FROM OLD.account_status
        OR NEW.deactivated_at IS DISTINCT FROM OLD.deactivated_at
        OR NEW.deactivation_reason IS DISTINCT FROM OLD.deactivation_reason
        OR NEW.deactivated_by IS DISTINCT FROM OLD.deactivated_by
    ) THEN

        IF current_user NOT IN ('postgres', 'service_role') THEN
            RAISE EXCEPTION
                'Account status fields can only be modified by authorized administrative operations';
        END IF;

    END IF;

    RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_protect_account_status_fields
ON public.profiles;

CREATE TRIGGER trg_protect_account_status_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_account_status_fields();
