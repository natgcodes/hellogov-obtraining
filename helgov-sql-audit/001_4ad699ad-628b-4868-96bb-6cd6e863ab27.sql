│
◇  Downloading snippet...
-- ============================================================
-- Query 347: Audit Jose Oropeza's Quiz-Day Associations
-- READ ONLY — No data modifications
-- ============================================================

SELECT
    d.day_number,
    d.title AS day_title,
    d.is_published AS day_published,
    m.title AS module_title,
    q.title AS quiz_title,
    q.id AS quiz_id,
    q.is_published AS quiz_published,
    q.is_required AS quiz_required,
    q.passing_score,
    qa.attempt_number,
    qa.status AS attempt_status,
    qa.score,
    qa.passed,
    qa.submitted_at
FROM public.profiles p
JOIN public.quiz_attempts qa
    ON qa.learner_id = p.id
JOIN public.quizzes q
    ON q.id = qa.quiz_id
LEFT JOIN public.modules m
    ON m.id = q.module_id
LEFT JOIN public.days d
    ON d.id = m.day_id
WHERE LOWER(p.email) = 'jose.oropeza@hellogov.com'
ORDER BY
    d.day_number NULLS LAST,
    m.title,
    q.title,
    qa.attempt_number;
