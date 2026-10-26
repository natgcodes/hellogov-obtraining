│
◇  Downloading snippet...
-- ============================================================
-- QUERY 185
-- Backfill Historical Grading Methods
-- ============================================================

WITH historical_classification AS (

    SELECT
        qa.id AS attempt_id,

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
            AND ans.graded_at IS NOT NULL
        ) AS graded_manual_answers

    FROM public.quiz_attempts qa

    JOIN public.quizzes q
        ON q.id = qa.quiz_id

    LEFT JOIN public.quiz_questions qq
        ON qq.quiz_id = q.id

    LEFT JOIN public.quiz_answers ans
        ON ans.question_id = qq.id
        AND ans.attempt_id = qa.id

    WHERE qa.status = 'graded'
      AND qa.grading_method IS NULL

    GROUP BY qa.id

),

classification AS (

    SELECT
        attempt_id,

        CASE
            WHEN graded_manual_answers > 0
                THEN 'manual'

            WHEN manual_questions = 0
                THEN 'automatic'

            ELSE NULL
        END AS detected_method

    FROM historical_classification

)

UPDATE public.quiz_attempts qa

SET grading_method = c.detected_method

FROM classification c

WHERE qa.id = c.attempt_id
  AND c.detected_method IS NOT NULL

RETURNING
    qa.id,
    qa.grading_method,
    qa.score,
    qa.passed,
    qa.reviewed_by;
