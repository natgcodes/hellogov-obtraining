│
◇  Downloading snippet...
create or replace function public.is_day_complete(
  target_day_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  required_module_count integer;
  incomplete_module_count integer;

  required_checkpoint_count integer;
  incomplete_checkpoint_count integer;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  if auth.uid() is null then
    return false;
  end if;


  -- ==========================================================
  -- REQUIRED MODULES
  -- ==========================================================

  select count(*)
  into required_module_count
  from public.modules
  where day_id = target_day_id
    and is_required = true;


  select count(*)
  into incomplete_module_count
  from public.modules m
  where m.day_id = target_day_id
    and m.is_required = true
    and not exists (
      select 1
      from public.learner_module_progress lmp
      where lmp.module_id = m.id
        and lmp.learner_id = auth.uid()
        and lmp.status = 'completed'
    );


  -- ==========================================================
  -- REQUIRED CHECKPOINTS
  -- ==========================================================

  select count(*)
  into required_checkpoint_count
  from public.checkpoints c
  where c.day_id = target_day_id
    and c.is_required = true;


  select count(*)
  into incomplete_checkpoint_count
  from public.checkpoints c
  where c.day_id = target_day_id
    and c.is_required = true
    and not exists (
      select 1
      from public.checkpoint_results cr
      where cr.checkpoint_id = c.id
        and cr.learner_id = auth.uid()
        and cr.status = 'graded'
        and cr.passed = true
    );


  -- ==========================================================
  -- EMPTY DAY PROTECTION
  -- ==========================================================

  if
    required_module_count = 0
    and required_checkpoint_count = 0
  then
    return false;
  end if;


  -- ==========================================================
  -- DAY COMPLETE
  -- ==========================================================

  return
    incomplete_module_count = 0
    and incomplete_checkpoint_count = 0;

end;
$function$;
