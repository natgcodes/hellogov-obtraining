│
◇  Downloading snippet...
-- Query 314 — Deactivate Hendrina's Authentication Access

UPDATE auth.users
SET
    banned_until = NOW() + INTERVAL '100 years'
WHERE id = 'b65b11de-b67e-4333-9a11-d76e4137564d'
  AND email = 'hendrina.garcia@hellogov.com'
  AND banned_until IS NULL
RETURNING
    id,
    email,
    banned_until;
