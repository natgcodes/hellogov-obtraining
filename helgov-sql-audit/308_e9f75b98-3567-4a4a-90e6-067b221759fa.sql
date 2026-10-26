│
◇  Downloading snippet...
create or replace function public.create_checkpoint_assessment(
  target_day_id uuid,
  checkpoint_title text,
  checkpoint_description text default null,
  target_checkpoint_type text default 'knowledge',
  target_passing_score numeric default 80,
  target_position integer default 0
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_quiz_id uuid;
  new_checkpoint_id uuid;
begin
  -- -------------------------------------------------------
  -- Validation
  -- -------------------------------------------------------

  if target_day_id is null then
    raise exception 'Day ID is required.';
  end if;

  if checkpoint_title is null
     or length(trim(checkpoint_title)) = 0 then
    raise exception 'Checkpoint title is required.';
  end if;

  if target_passing_score is not null
     and (
       target_passing_score < 0
       or target_passing_score > 100
     ) then
    raise exception 'Passing score must be between 0 and 100.';
  end if;

  if target_checkpoint_type not in (
    'knowledge',
    'practical',
    'mock_call',
    'trainer_review',
    'other'
  ) then
    raise exception 'Invalid checkpoint type.';
  end if;

  if not exists (
    select 1
    from public.days
    where id = target_day_id
  ) then
    raise exception 'Training day not found.';
  end if;

  -- -------------------------------------------------------
  -- Create the internal quiz used by the checkpoint
  -- -------------------------------------------------------

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

  -- -------------------------------------------------------
  -- Create the checkpoint and connect it to the quiz
  -- -------------------------------------------------------

  insert into public.checkpoints (
    day_id,
    title,
    description,
    checkpoint_type,
    passing_score,
    position,
    quiz_id
  )
  values (
    target_day_id,
    trim(checkpoint_title),
    nullif(trim(checkpoint_description), ''),
    target_checkpoint_type,
    target_passing_score,
    target_position,
    new_quiz_id
  )
  returning id into new_checkpoint_id;

  -- -------------------------------------------------------
  -- Return the checkpoint ID
  -- -------------------------------------------------------

  return new_checkpoint_id;
end;
$$;
