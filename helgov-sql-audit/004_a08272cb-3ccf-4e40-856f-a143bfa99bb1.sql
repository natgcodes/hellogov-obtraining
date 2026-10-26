│
◇  Downloading snippet...
-- Query 343A: Identify Trainer Account for Testing

SELECT
    id,
    full_name,
    email,
    role
FROM public.profiles
WHERE role = 'trainer'
ORDER BY full_name;
