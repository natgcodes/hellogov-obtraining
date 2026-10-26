│
◇  Downloading snippet...
-- ============================================================
-- QUERY 168
-- Inspect Trainer Learners Progress Function
-- ============================================================

SELECT pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_trainer_learners';
