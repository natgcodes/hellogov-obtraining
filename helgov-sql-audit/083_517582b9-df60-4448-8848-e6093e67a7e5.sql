│
◇  Downloading snippet...
SELECT
    d.id AS day_id,
    d.day_number,
    d.title,
    d.is_published,
    d.position,
    p.id AS program_id,
    p.title AS program_title
FROM public.days d
JOIN public.programs p
    ON p.id = d.program_id
WHERE d.day_number = 2
ORDER BY p.title;
