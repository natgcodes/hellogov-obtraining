│
◇  Downloading snippet...
-- QUERY 258
-- Allow a second attempt for Customer Journey (Day 2).
-- Preserve all existing attempts and results.

UPDATE public.quizzes
SET max_attempts = 2
WHERE id = 'd8d6090f-fe31-46b5-951e-f2777e59f977'
  AND module_id = '9d9b7355-b243-4042-a35b-4bbf80d9f5d9'
  AND max_attempts = 1
RETURNING
  id,
  title,
  max_attempts,
  module_id;
