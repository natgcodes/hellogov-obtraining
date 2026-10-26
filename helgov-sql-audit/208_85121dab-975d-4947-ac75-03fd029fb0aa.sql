│
◇  Downloading snippet...
create or replace function public.is_day_unlocked(
  target_day_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  target_day record;
  previous_day_id uuid;
begin

  if auth.uid() is null then
    return false;
  end if;

  select *
  into target_day
  from public.days
  where id = target_day_id
    and is_published = true;

  if target_day.id is null then
    return false;
  end if;

  -- Find the previous published day in this program.
  select d.id
  into previous_day_id
  from public.days d
  where d.program_id = target_day.program_id
    and d.is_published = true
    and (
      d.position < target_day.position
      or (
        d.position = target_day.position
        and d.day_number < target_day.day_number
      )
    )
  order by
    d.position desc,
    d.day_number desc
  limit 1;

  -- The first published day is always available.
  -- Setup items are informational/preparation tasks only
  -- and never block access to training.
  if previous_day_id is null then
    return true;
  end if;

  -- Every later day unlocks when the previous
  -- published day is complete.
  return public.is_day_complete(previous_day_id);

end;
$function$;
