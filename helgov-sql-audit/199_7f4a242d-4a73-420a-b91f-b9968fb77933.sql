│
◇  Downloading snippet...
-- Query 42 — Add optional resource link to practice activities

alter table public.activities
add column if not exists resource_url text;
