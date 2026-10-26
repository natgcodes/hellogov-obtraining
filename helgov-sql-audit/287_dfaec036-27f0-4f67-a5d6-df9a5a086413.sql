│
◇  Downloading snippet...
-- ============================================================
-- QUERY 63
-- Connect Checkpoint Sync to Quiz Submission
-- ============================================================

create or replace function public.trigger_sync_checkpoint_result()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin

  -- Only run after the attempt has actually been submitted.
  if
    new.submitted_at is not null
    and (
      old.submitted_at is null
      or old.status is distinct from new.status
      or old.score is distinct from new.score
      or old.passed is distinct from new.passed
    )
  then

    perform public.sync_checkpoint_result_from_quiz_attempt(
      new.id
    );

  end if;

  return new;

end;
$function$;


drop trigger if exists
  sync_checkpoint_result_after_attempt_update
on public.quiz_attempts;


create trigger
  sync_checkpoint_result_after_attempt_update
after update
on public.quiz_attempts
for each row
execute function
  public.trigger_sync_checkpoint_result();
