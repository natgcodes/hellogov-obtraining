│
◇  Downloading snippet...
-- ============================================================
-- Query 342: Verify Trainer Role Rosters
-- ============================================================

SELECT
    p.full_name,
    p.email,
    p.role,
    pe.status AS enrollment_status,
    pe.program_id
FROM public.program_enrollments pe
JOIN public.profiles p
    ON p.id = pe.learner_id
WHERE p.role IN (
    'learner',
    'observer',
    'cross_training',
    'team_leader'
)
ORDER BY
    CASE p.role
        WHEN 'learner' THEN 1
        WHEN 'observer' THEN 2
        WHEN 'cross_training' THEN 3
        WHEN 'team_leader' THEN 4
    END,
    p.full_name;
