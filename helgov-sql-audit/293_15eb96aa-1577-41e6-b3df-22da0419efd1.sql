│
◇  Downloading snippet...
alter table public.checkpoints
add column if not exists is_required boolean not null default true;
