│
◇  Downloading snippet...
-- =========================================================
-- CHECKPOINT TYPES + SHARED DAY CONTENT ORDER
-- CORRECTED VERSION
-- =========================================================

begin;


-- ---------------------------------------------------------
-- 1. REMOVE OLD CHECKPOINT TYPE CONSTRAINT FIRST
-- ---------------------------------------------------------

alter table public.checkpoints
  drop constraint if exists checkpoints_checkpoint_type_check;


-- ---------------------------------------------------------
-- 2. EXTEND CHECKPOINTS FOR TRAINER SESSIONS
-- ---------------------------------------------------------

alter table public.checkpoints
  add column if not exists meeting_url text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists duration_minutes integer;


-- ---------------------------------------------------------
-- 3. MIGRATE EXISTING CHECKPOINT TYPES
-- ---------------------------------------------------------

update public.checkpoints
set checkpoint_type = 'assessment'
where checkpoint_type = 'knowledge';


-- ---------------------------------------------------------
-- 4. CHANGE DEFAULT
-- ---------------------------------------------------------

alter table public.checkpoints
  alter column checkpoint_type
  set default 'assessment';


-- ---------------------------------------------------------
-- 5. ADD NEW CHECKPOINT TYPE CONSTRAINT
-- ---------------------------------------------------------

alter table public.checkpoints
  add constraint checkpoints_checkpoint_type_check
  check (
    checkpoint_type in (
      'assessment',
      'trainer_session',
      'information'
    )
  );


-- ---------------------------------------------------------
-- 6. VALIDATE SESSION DURATION
-- ---------------------------------------------------------

alter table public.checkpoints
  drop constraint if exists checkpoints_duration_minutes_check;

alter table public.checkpoints
  add constraint checkpoints_duration_minutes_check
  check (
    duration_minutes is null
    or duration_minutes > 0
  );


-- ---------------------------------------------------------
-- 7. CREATE SHARED DAY CONTENT ORDER
-- ---------------------------------------------------------

create table if not exists public.day_content (
  id uuid primary key default gen_random_uuid(),

  day_id uuid not null
    references public.days(id)
    on delete cascade,

  content_type text not null,

  content_id uuid not null,

  position integer not null default 0,

  created_at timestamptz not null default now(),

  constraint day_content_type_check
    check (
      content_type in (
        'module',
        'checkpoint'
      )
    ),

  constraint day_content_unique_content
    unique (
      content_type,
      content_id
    ),

  constraint day_content_unique_position
    unique (
      day_id,
      position
    )
);


-- ---------------------------------------------------------
-- 8. INDEX
-- ---------------------------------------------------------

create index if not exists
  day_content_day_position_idx
on public.day_content (
  day_id,
  position
);


-- ---------------------------------------------------------
-- 9. MIGRATE EXISTING MODULES
-- ---------------------------------------------------------

insert into public.day_content (
  day_id,
  content_type,
  content_id,
  position
)
select
  m.day_id,
  'module',
  m.id,
  row_number() over (
    partition by m.day_id
    order by
      m.position,
      m.created_at,
      m.id
  )::integer
from public.modules m
where not exists (
  select 1
  from public.day_content dc
  where dc.content_type = 'module'
    and dc.content_id = m.id
);


-- ---------------------------------------------------------
-- 10. MIGRATE EXISTING CHECKPOINTS
--     AFTER ALL MODULES IN EACH DAY
-- ---------------------------------------------------------

insert into public.day_content (
  day_id,
  content_type,
  content_id,
  position
)
select
  c.day_id,
  'checkpoint',
  c.id,
  (
    coalesce(
      (
        select max(dc.position)
        from public.day_content dc
        where dc.day_id = c.day_id
      ),
      0
    )
    +
    row_number() over (
      partition by c.day_id
      order by
        c.position,
        c.created_at,
        c.id
    )
  )::integer
from public.checkpoints c
where not exists (
  select 1
  from public.day_content dc
  where dc.content_type = 'checkpoint'
    and dc.content_id = c.id
);


-- ---------------------------------------------------------
-- 11. ENABLE RLS
-- ---------------------------------------------------------

alter table public.day_content
enable row level security;


-- ---------------------------------------------------------
-- 12. AUTHENTICATED USERS CAN READ DAY ORDER
-- ---------------------------------------------------------

drop policy if exists
  "Authenticated users can read day content"
on public.day_content;

create policy
  "Authenticated users can read day content"
on public.day_content
for select
to authenticated
using (true);


-- ---------------------------------------------------------
-- 13. TRAINERS CAN INSERT
-- ---------------------------------------------------------

drop policy if exists
  "Trainers can insert day content"
on public.day_content;

create policy
  "Trainers can insert day content"
on public.day_content
for insert
to authenticated
with check (
  public.is_trainer()
);


-- ---------------------------------------------------------
-- 14. TRAINERS CAN UPDATE / REORDER
-- ---------------------------------------------------------

drop policy if exists
  "Trainers can update day content"
on public.day_content;

create policy
  "Trainers can update day content"
on public.day_content
for update
to authenticated
using (
  public.is_trainer()
)
with check (
  public.is_trainer()
);


-- ---------------------------------------------------------
-- 15. TRAINERS CAN DELETE
-- ---------------------------------------------------------

drop policy if exists
  "Trainers can delete day content"
on public.day_content;

create policy
  "Trainers can delete day content"
on public.day_content
for delete
to authenticated
using (
  public.is_trainer()
);


commit;
