│
◇  Downloading snippet...
-- ============================================================
-- Query 344: Verify Trainer Progress Functions
-- Temporary Trainer Authentication Context
-- ============================================================

BEGIN;

-- Simulate the authenticated Trainer context
-- only within this transaction.

SET LOCAL ROLE authenticated;

SELECT set_config(
    'request.jwt.claim.sub',
    '591ac2ee-d99b-4ef9-9336-84c7daf455c2',
    true
);

SELECT set_config(
    'request.jwt.claim.role',
    'authenticated',
    true
);

-- Verify both rosters.

SELECT
    'Trainees' AS roster,
    COUNT(*) AS total_users,
    ROUND(AVG(progress_percent), 2) AS average_progress,
    COUNT(*) FILTER (
        WHERE enrollment_status = 'completed'
    ) AS completed,
    COALESCE(SUM(needs_review), 0) AS needs_review
FROM public.get_trainer_learners(
    '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0'::uuid
)

UNION ALL

SELECT
    'Other Roles' AS roster,
    COUNT(*) AS total_users,
    ROUND(AVG(progress_percent), 2) AS average_progress,
    COUNT(*) FILTER (
        WHERE enrollment_status = 'completed'
    ) AS completed,
    COALESCE(SUM(needs_review), 0) AS needs_review
FROM public.get_trainer_other_roles(
    '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0'::uuid
);

ROLLBACK;
