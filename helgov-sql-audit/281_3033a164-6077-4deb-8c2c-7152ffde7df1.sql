│
◇  Downloading snippet...
-- ============================================================
-- QUERY 69
-- Recalculate Enrollment After Module Progress Changes
-- ============================================================

create or replace function public.trigger_recalculate_enrollment_from_module()
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
  from public.modules m
  join public.days d
    on d.id = m.day_id
  where m.id = new.module_id;


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
  recalculate_enrollment_after_module_change
on public.learner_module_progress;


create trigger
  recalculate_enrollment_after_module_change
after insert or update
on public.learner_module_progress
for each row
execute function
  public.trigger_recalculate_enrollment_from_module();
