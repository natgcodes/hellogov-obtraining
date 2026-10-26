│
◇  Downloading snippet...
begin;

create or replace function public.delete_day_checkpoint(
  target_checkpoint_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_quiz_id uuid;
begin
  if auth.uid() is null or not public.is_trainer() then
    raise exception 'Trainer access required.';
  end if;

  if target_checkpoint_id is null then
    raise exception 'Checkpoint ID is required.';
  end if;

  select quiz_id
  into target_quiz_id
  from public.checkpoints
  where id = target_checkpoint_id;

  if not found then
    raise exception 'Checkpoint not found.';
  end if;

  delete from public.day_content
  where content_type = 'checkpoint'
    and content_id = target_checkpoint_id;

  delete from public.checkpoints
  where id = target_checkpoint_id;

  if target_quiz_id is not null then
    delete from public.quizzes
    where id = target_quiz_id;
  end if;
end;
$function$;

revoke all
on function public.delete_day_checkpoint(uuid)
from public;

grant execute
on function public.delete_day_checkpoint(uuid)
to authenticated;

commit;
