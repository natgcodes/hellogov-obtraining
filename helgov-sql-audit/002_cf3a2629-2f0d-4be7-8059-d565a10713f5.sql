│
◇  Downloading snippet...
-- ============================================================
-- Query 346: Audit Jose Oropeza's Quiz Attempts
-- READ ONLY — No data modifications
-- ============================================================

SELECT
    p.full_name AS learner,
    p.email,
    qa.id AS attempt_id,
    qa.quiz_id,
    q.title AS quiz_title,
    qa.attempt_number,
    qa.status AS attempt_status,
    qa.score,
    qa.passed,
    qa.started_at,
    qa.submitted_at,
    qa.graded_at,
    COUNT(ans.id) AS saved_answers
FROM public.profiles p
LEFT JOIN public.quiz_attempts qa
    ON qa.learner_id = p.id
LEFT JOIN public.quizzes q
    ON q.id = qa.quiz_id
LEFT JOIN public.quiz_answers ans
    ON ans.attempt_id = qa.id
WHERE LOWER(p.email) = 'jose.oropeza@hellogov.com'
GROUP BY
    p.full_name,
    p.email,
    qa.id,
    qa.quiz_id,
    q.title,
    qa.attempt_number,
    qa.status,
    qa.score,
    qa.passed,
    qa.started_at,
    qa.submitted_at,
    qa.graded_at
ORDER BY
    qa.started_at DESC NULLS LAST;
