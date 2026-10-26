│
◇  Downloading snippet...
-- QUERY 207
-- Add Module Publication Status

ALTER TABLE public.modules
ADD COLUMN publication_status text
NOT NULL
DEFAULT 'published'
CONSTRAINT modules_publication_status_check
CHECK (
  publication_status IN (
    'draft',
    'locked',
    'published'
  )
);
