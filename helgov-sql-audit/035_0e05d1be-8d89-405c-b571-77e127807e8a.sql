│
◇  Downloading snippet...
-- Query 313 — Check Hendrina's Authentication Providers

SELECT
    u.id,
    u.email,
    u.banned_until,
    u.last_sign_in_at,
    i.provider,
    i.provider_id
FROM auth.users u
LEFT JOIN auth.identities i
    ON i.user_id = u.id
WHERE u.id = 'b65b11de-b67e-4333-9a11-d76e4137564d';

