│
◇  Downloading snippet...
-- =========================================================
-- DAY CONTENT + CHECKPOINT CREATION ENGINE
-- =========================================================

begin;


-- =========================================================
-- 1. REPLACE ASSESSMENT CHECKPOINT FUNCTION
-- =========================================================

create or replace function public.create_checkpoint_assessment(
  target_day_id uuid,
  checkpoint_title text,
  checkpoint_description text default null,
  target_checkpoint_type text default 'assessment',
  target_passing_score numeric default 80,
  target_position integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_quiz_id uuid;
  new_checkpoint_id uuid;
  new_day_position integer;
begin

  if auth.uid() is null or not public.is_trainer() then
    raise exception 'Trainer access required.';
  end if;

  if target_day_id is null then
    raise exception 'Day ID is required.';
  end if;

  if checkpoint_title is null
     or length(trim(checkpoint_title)) = 0 then
    raise exception 'Checkpoint title is required.';
  end if;

  if target_checkpoint_type <> 'assessment' then
    raise exception 'This function only creates assessment checkpoints.';
  end if;

  if target_passing_score is not null
     and (
       target_passing_score < 0
       or target_passing_score > 100
     ) then
    raise exception 'Passing score must be between 0 and 100.';
  end if;

  if not exists (
    select 1
    from public.days
    where id = target_day_id
  ) then
    raise exception 'Training day not found.';
  end if;


  -- Internal quiz
  insert into public.quizzes (
    module_id,
    title,
    description,
    instructions,
    passing_score,
    max_attempts,
    position,
    is_required,
    is_published,
    shuffle_questions,
    show_results
  )
  values (
    null,
    trim(checkpoint_title),
    nullif(trim(checkpoint_description), ''),
    null,
    coalesce(target_passing_score, 0),
    1,
    target_position,
    true,
    true,
    false,
    true
  )
  returning id into new_quiz_id;


  -- Checkpoint
  insert into public.checkpoints (
    day_id,
    title,
    description,
    checkpoint_type,
    passing_score,
    position,
    quiz_id,
    is_required
  )
  values (
    target_day_id,
    trim(checkpoint_title),
    nullif(trim(checkpoint_description), ''),
    'assessment',
    target_passing_score,
    target_position,
    new_quiz_id,
    true
  )
  returning id into new_checkpoint_id;


  -- Append to shared Day Content sequence
  select coalesce(max(dc.position), 0) + 1
  into new_day_position
  from public.day_content dc
  where dc.day_id = target_day_id;

  insert into public.day_content (
    day_id,
    content_type,
    content_id,
    position
  )
  values (
    target_day_id,
    'checkpoint',
    new_checkpoint_id,
    new_day_position
  );


  return new_checkpoint_id;

exception
  when others then
    raise;
end;
$function$;


-- =========================================================
-- 2. CREATE NON-ASSESSMENT CHECKPOINT FUNCTION
--    trainer_session / information
-- =========================================================

create or replace function public.create_day_checkpoint(
  target_day_id uuid,
  checkpoint_title text,
  checkpoint_description text default null,
  target_checkpoint_type text default 'information',
  target_meeting_url text default null,
  target_scheduled_at timestamptz default null,
  target_duration_minutes integer default null,
  target_is_required boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_checkpoint_id uuid;
  new_checkpoint_position integer;
  new_day_position integer;
begin

  if auth.uid() is null or not public.is_trainer() then
    raise exception 'Trainer access required.';
  end if;

  if target_day_id is null then
    raise exception 'Day ID is required.';
  end if;

  if checkpoint_title is null
     or length(trim(checkpoint_title)) = 0 then
    raise exception 'Checkpoint title is required.';
  end if;

  if target_checkpoint_type not in (
    'trainer_session',
    'information'
  ) then
    raise exception 'Invalid checkpoint type.';
  end if;

  if target_duration_minutes is not null
     and target_duration_minutes <= 0 then
    raise exception 'Duration must be greater than zero.';
  end if;

  if not exists (
    select 1
    from public.days
    where id = target_day_id
  ) then
    raise exception 'Training day not found.';
  end if;


  select coalesce(max(c.position), 0) + 1
  into new_checkpoint_position
  from public.checkpoints c
  where c.day_id = target_day_id;


  insert into public.checkpoints (
    day_id,
    title,
    description,
    checkpoint_type,
    passing_score,
    position,
    quiz_id,
    is_required,
    meeting_url,
    scheduled_at,
    duration_minutes
  )
  values (
    target_day_id,
    trim(checkpoint_title),
    nullif(trim(checkpoint_description), ''),
    target_checkpoint_type,
    null,
    new_checkpoint_position,
    null,
    target_is_required,
    case
      when target_checkpoint_type = 'trainer_session'
      then nullif(trim(target_meeting_url), '')
      else null
    end,
    case
      when target_checkpoint_type = 'trainer_session'
      then target_scheduled_at
      else null
    end,
    case
      when target_checkpoint_type = 'trainer_session'
      then target_duration_minutes
      else null
    end
  )
  returning id into new_checkpoint_id;


  select coalesce(max(dc.position), 0) + 1
  into new_day_position
  from public.day_content dc
  where dc.day_id = target_day_id;


  insert into public.day_content (
    day_id,
    content_type,
    content_id,
    position
  )
  values (
    target_day_id,
    'checkpoint',
    new_checkpoint_id,
    new_day_position
  );


  return new_checkpoint_id;
end;
$function$;


-- =========================================================
-- 3. CREATE MODULE + DAY CONTENT ATOMICALLY
-- =========================================================

create or replace function public.create_day_module(
  target_day_id uuid,
  module_title text,
  module_description text default null,
  module_objective text default null,
  module_duration_minutes integer default null,
  module_is_required boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  new_module_id uuid;
  new_module_position integer;
  new_day_position integer;
begin

  if auth.uid() is null or not public.is_trainer() then
    raise exception 'Trainer access required.';
  end if;

  if target_day_id is null then
    raise exception 'Day ID is required.';
  end if;

  if module_title is null
     or length(trim(module_title)) = 0 then
    raise exception 'Module title is required.';
  end if;

  if module_duration_minutes is not null
     and module_duration_minutes < 0 then
    raise exception 'Duration cannot be negative.';
  end if;

  if not exists (
    select 1
    from public.days
    where id = target_day_id
  ) then
    raise exception 'Training day not found.';
  end if;


  select coalesce(max(m.position), 0) + 1
  into new_module_position
  from public.modules m
  where m.day_id = target_day_id;


  insert into public.modules (
    day_id,
    title,
    description,
    objective,
    duration_minutes,
    position,
    is_required
  )
  values (
    target_day_id,
    trim(module_title),
    nullif(trim(module_description), ''),
    nullif(trim(module_objective), ''),
    module_duration_minutes,
    new_module_position,
    module_is_required
  )
  returning id into new_module_id;


  select coalesce(max(dc.position), 0) + 1
  into new_day_position
  from public.day_content dc
  where dc.day_id = target_day_id;


  insert into public.day_content (
    day_id,
    content_type,
    content_id,
    position
  )
  values (
    target_day_id,
    'module',
    new_module_id,
    new_day_position
  );


  return new_module_id;
end;
$function$;


-- =========================================================
-- 4. PERMISSIONS
-- =========================================================

revoke all on function public.create_checkpoint_assessment(
  uuid,
  text,
  text,
  text,
  numeric,
  integer
) from public;

grant execute on function public.create_checkpoint_assessment(
  uuid,
  text,
  text,
  text,
  numeric,
  integer
) to authenticated;


revoke all on function public.create_day_checkpoint(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  integer,
  boolean
) from public;

grant execute on function public.create_day_checkpoint(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  integer,
  boolean
) to authenticated;


revoke all on function public.create_day_module(
  uuid,
  text,
  text,
  text,
  integer,
  boolean
) from public;

grant execute on function public.create_day_module(
  uuid,
  text,
  text,
  text,
  integer,
  boolean
) to authenticated;


commit;
