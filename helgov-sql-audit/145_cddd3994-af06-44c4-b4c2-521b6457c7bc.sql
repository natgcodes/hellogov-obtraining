│
◇  Downloading snippet...
-- ============================================================
-- QUERY 184
-- Audit Historical Grading Methods
-- READ ONLY
-- ============================================================

SELECT
    qa.id AS attempt_id,

    q.title AS assessment,

    p.full_name AS learner,

    qa.status,

    qa.score,

    qa.passed,

    qa.grading_method,

    qa.reviewed_by,

    qa.graded_at,

    COUNT(DISTINCT qq.id) AS total_questions,

    COUNT(DISTINCT qq.id) FILTER (
        WHERE qq.question_type IN (
            'open_text',
            'file_upload'
        )
    ) AS manual_questions,

    COUNT(DISTINCT ans.id) FILTER (
        WHERE qq.question_type IN (
            'open_text',
            'file_upload'
        )
    ) AS manual_answers,

    COUNT(DISTINCT ans.id) FILTER (
        WHERE qq.question_type IN (
            'open_text',
            'file_upload'
        )
        AND ans.graded_at IS NOT NULL
    ) AS manually_graded_answers,

    CASE

        WHEN COUNT(DISTINCT ans.id) FILTER (
            WHERE qq.question_type IN (
                'open_text',
                'file_upload'
            )
            AND ans.graded_at IS NOT NULL
        ) > 0
        THEN 'LIKELY_MANUAL'

        WHEN COUNT(DISTINCT qq.id) FILTER (
            WHERE qq.question_type IN (
                'open_text',
                'file_upload'
            )
        ) = 0
        THEN 'LIKELY_AUTOMATIC'

        ELSE 'NEEDS_VERIFICATION'

    END AS suggested_classification

FROM public.quiz_attempts qa

JOIN public.quizzes q
    ON q.id = qa.quiz_id

JOIN public.profiles p
    ON p.id = qa.learner_id

LEFT JOIN public.quiz_questions qq
    ON qq.quiz_id = q.id

LEFT JOIN public.quiz_answers ans
    ON ans.question_id = qq.id
    AND ans.attempt_id = qa.id

WHERE qa.status = 'graded'
  AND qa.grading_method IS NULL

GROUP BY
    qa.id,
    q.title,
    p.full_name,
    qa.status,
    qa.score,
    qa.passed,
    qa.grading_method,
    qa.reviewed_by,
    qa.graded_at

ORDER BY qa.graded_at DESC;
