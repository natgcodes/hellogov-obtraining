│
◇  Downloading snippet...
-- =========================================================
-- 1. CHECKPOINT SETTING
-- =========================================================

alter table public.checkpoints
add column if not exists allow_learner_completion boolean
not null
default false;


-- =========================================================
-- 2. LEARNER MANUAL CHECKPOINT COMPLETION
-- =========================================================

create or replace function public.mark_checkpoint_completed(
  target_checkpoint_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_learner_id uuid;
  checkpoint_record record;
begin
  -- -------------------------------------------------------
  -- AUTH
  -- -------------------------------------------------------

  current_learner_id := auth.uid();

  if current_learner_id is null then
    raise exception 'Not authenticated';
  end if;

  -- -------------------------------------------------------
  -- VERIFY LEARNER
  -- -------------------------------------------------------

  if not exists (
    select 1
    from public.profiles
    where id = current_learner_id
      and role = 'learner'
  ) then
    raise exception 'Learner access required';
  end if;

  -- -------------------------------------------------------
  -- LOAD CHECKPOINT
  -- -------------------------------------------------------

  select
    cp.id,
    cp.day_id,
    cp.allow_learner_completion
  into checkpoint_record
  from public.checkpoints cp
  where cp.id = target_checkpoint_id;

  if checkpoint_record.id is null then
    raise exception 'Checkpoint not found';
  end if;

  -- -------------------------------------------------------
  -- VERIFY MANUAL COMPLETION IS ENABLED
  -- -------------------------------------------------------

  if not checkpoint_record.allow_learner_completion then
    raise exception 'Learner completion is not enabled for this checkpoint';
  end if;

  -- -------------------------------------------------------
  -- UPSERT RESULT
  -- -------------------------------------------------------

  insert into public.checkpoint_results (
    checkpoint_id,
    learner_id,
    status,
    completed_at
  )
  values (
    target_checkpoint_id,
    current_learner_id,
    'completed',
    now()
  )
  on conflict (checkpoint_id, learner_id)
  do update
  set
    status = 'completed',
    completed_at = now();
end;
$$;


-- =========================================================
-- 3. SECURITY
-- =========================================================

revoke all
on function public.mark_checkpoint_completed(uuid)
from public;

grant execute
on function public.mark_checkpoint_completed(uuid)
to authenticated;
