│
◇  Downloading snippet...
-- ============================================================
-- QUERY 68
-- Recalculate Enrollment After Checkpoint Changes
-- ============================================================

create or replace function public.trigger_recalculate_enrollment_from_checkpoint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_program_id uuid;
begin

  -- ==========================================================
  -- FIND PROGRAM
  -- ==========================================================

  select d.program_id
  into v_program_id
  from public.checkpoints c
  join public.days d
    on d.id = c.day_id
  where c.id = new.checkpoint_id;


  -- ==========================================================
  -- RECALCULATE ENROLLMENT
  -- ==========================================================

  if v_program_id is not null then

    perform public.recalculate_program_enrollment(
      v_program_id,
      new.learner_id
    );

  end if;


  return new;

end;
$function$;


-- ============================================================
-- TRIGGER
-- ============================================================

drop trigger if exists
  recalculate_enrollment_after_checkpoint_change
on public.checkpoint_results;


create trigger
  recalculate_enrollment_after_checkpoint_change
after insert or update
on public.checkpoint_results
for each row
execute function
  public.trigger_recalculate_enrollment_from_checkpoint();
