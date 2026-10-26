│
◇  Downloading snippet...
-- Query 320 — Synchronize Hendrina's Deactivated Account Status

UPDATE public.profiles
SET
    account_status = 'deactivated',
    deactivated_at = NOW(),
    deactivation_reason = 'Resigned',
    deactivated_by = NULL
WHERE id = 'b65b11de-b67e-4333-9a11-d76e4137564d'
  AND email = 'hendrina.garcia@hellogov.com'
  AND account_status = 'active'
RETURNING
    id,
    full_name,
    email,
    account_status,
    deactivated_at,
    deactivation_reason;
