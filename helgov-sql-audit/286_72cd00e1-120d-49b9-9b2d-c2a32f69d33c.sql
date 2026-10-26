│
◇  Downloading snippet...
-- ============================================================
-- QUERY 64
-- Add Required Setting to Checkpoints
-- ============================================================

alter table public.checkpoints
add column if not exists is_required boolean not null default true;
