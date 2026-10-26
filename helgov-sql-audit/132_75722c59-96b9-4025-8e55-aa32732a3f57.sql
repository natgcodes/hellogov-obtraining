│
◇  Downloading snippet...
-- ============================================================
-- QUERY 197 — DAY UNLOCK VALIDATION
-- READ ONLY — DOES NOT MODIFY DATA
-- ============================================================

WITH learner_accounts AS (
    SELECT
        p.id AS learner_id,
        p.full_name,
        p.email
    FROM public.profiles p
    WHERE p.role = 'learner'
),

published_days AS (
    SELECT
       
