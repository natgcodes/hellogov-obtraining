│
◇  Downloading snippet...
-- ============================================================
-- QUERY 192
-- Inspect Learner Day 1 Test Attempts
-- READ ONLY
-- ============================================================

SELECT
  qa.id AS attempt_id,
  qa.quiz_id,
  qa.learner_id,
  qa.attempt_number,
  qa.status,
  qa.score,
  qa.passed,
  qa.grading_method,
  qa.started_at,
  qa.submitted_at,
  qa.graded_at

FROM public.quiz_attempts qa

WHERE qa.learner_id =
  '06ec7963-c338-45bd-8eb6-43de0134c281'::uuid

  AND qa.quiz_id =
  'ee23da64-0555-4a4d-855f-30ead2e06f04'::uuid

ORDER BY
  qa.attempt_number DESC,
  qa.started_at DESC;
