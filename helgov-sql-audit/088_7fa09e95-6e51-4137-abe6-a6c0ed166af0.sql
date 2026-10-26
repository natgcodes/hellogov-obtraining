│
◇  Downloading snippet...
SELECT
    q.id AS question_id,
    q.question_text,
    q.question_type,
    COUNT(mp.id) AS matching_pairs_count,
    STRING_AGG(
        mp.left_text || ' → ' || mp.right_text,
        ' | '
        ORDER BY mp.position
    ) AS configured_matches
FROM public.quiz_questions q
LEFT JOIN public.quiz_matching_pairs mp
    ON mp.question_id = q.id
WHERE
    q.question_type ILIKE '%match%'
GROUP BY
    q.id,
    q.question_text,
    q.question_type
ORDER BY
    q.question_type,
    q.question_text;
