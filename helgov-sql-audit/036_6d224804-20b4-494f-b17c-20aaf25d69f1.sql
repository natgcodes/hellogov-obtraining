│
◇  Downloading snippet...
-- Query 312 — Locate Hendrina's Account

SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.created_at,
    au.id IS NOT NULL AS auth_account_exists,
    au.banned_until,
    pe.program_id,
    pe.status AS enrollment_status
FROM public.profiles p
LEFT JOIN auth.users au
    ON au.id = p.id
LEFT JOIN public.program_enrollments pe
    ON pe.learner_id = p.id
WHERE p.full_name ILIKE '%Hendrina%'
   OR p.email ILIKE '%Hendrina%'
ORDER BY p.full_name;
