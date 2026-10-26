│
◇  Downloading snippet...
-- ============================================================
-- QUERY 195
-- Inspect Day 1 Test Question Types
-- READ ONLY
-- ============================================================

SELECT
  qq.position,
  qq.id AS question_id,
  qq.question_text,
  qq.question_type,
  qq.points,
  qq.is_required,
  qq.allow_partial_credit

FROM public.quiz_questions qq

WHERE qq.quiz_id =
  'ee23da64-0555-4a4d-855f-30ead2e06f04'::uuid

ORDER BY qq.position;
