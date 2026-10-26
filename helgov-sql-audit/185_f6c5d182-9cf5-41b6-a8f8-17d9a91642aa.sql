│
◇  Downloading snippet...
begin;

create or replace function public.move_day_content(
  target_day_content_id uuid,
  move_direction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_row public.day_content%rowtype;
  target_row public.day_content%rowtype;
  temporary_position integer;
begin
  if auth.uid() is null or not public.is_trainer() then
    raise exception 'Trainer access required.';
  end if;

  if move_direction not in ('up', 'down') then
    raise exception 'Direction must be up or down.';
  end if;

  select *
  into current_row
  from public.day_content
  where id = target_day_content_id;

  if not found then
    raise exception 'Day content item not found.';
  end if;

  if move_direction = 'up' then
    select *
    into target_row
    from public.day_content
    where day_id = current_row.day_id
      and position < current_row.position
    order by position desc
    limit 1;
  else
    select *
    into target_row
    from public.day_content
    where day_id = current_row.day_id
      and position > current_row.position
    order by position asc
    limit 1;
  end if;

  -- Already first/last item.
  if not found then
    return;
  end if;

  temporary_position := -1000000;

  while exists (
    select 1
    from public.day_content
    where day_id = current_row.day_id
      and position = temporary_position
  ) loop
    temporary_position := temporary_position - 1;
  end loop;

  update public.day_content
  set position = temporary_position
  where id = current_row.id;

  update public.day_content
  set position = current_row.position
  where id = target_row.id;

  update public.day_content
  set position = target_row.position
  where id = current_row.id;
end;
$function$;

revoke all on function public.move_day_content(uuid, text) from public;

grant execute
on function public.move_day_content(uuid, text)
to authenticated;

commit;
