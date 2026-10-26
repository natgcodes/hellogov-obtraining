│
◇  Downloading snippet...
create or replace function public.trainer_update_learner_status(
  target_program_id uuid,
  target_learner_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only trainers may use this function
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'trainer'
  ) then
    raise exception 'Only trainers can update learner status';
  end if;

  -- Validate allowed status
  if new_status not in (
    'not_started',
    'in_progress',
    'completed'
  ) then
    raise exception 'Invalid enrollment status';
  end if;

  update public.enrollments
  set
    status = new_status,
    started_at = case
      when new_status = 'not_started' then null
      when new_status = 'in_progress'
        then coalesce(started_at, now())
      else started_at
    end,
    completed_at = case
      when new_status = 'completed' then now()
      else null
    end
  where program_id = target_program_id
    and learner_id = target_learner_id;

  if not found then
    raise exception 'Enrollment not found';
  end if;
end;
$$;

revoke all
on function public.trainer_update_learner_status(uuid, uuid, text)
from public;

grant execute
on function public.trainer_update_learner_status(uuid, uuid, text)
to authenticated;
