│
◇  Downloading snippet...
-- ============================================================
-- QUERY 65
-- Include Required Checkpoints in Day Completion
-- ============================================================

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
  from public.modules m
  where m.day_id = target_day_id
    and m.is_required = true;


  -- A training day must contain at least one required module
  -- or one required checkpoint.
  --
  -- We check checkpoints below before deciding whether the
  -- day is structurally empty.


  -- Count required modules that the learner has NOT completed.

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


  -- A required checkpoint only counts as complete when:
  --
  --   status = graded
  --   AND
  --   passed = true
  --
  -- Therefore:
  -- - not started      = incomplete
  -- - in progress      = incomplete
  -- - submitted        = incomplete
  -- - pending review   = incomplete
  -- - graded + failed  = incomplete
  -- - graded + passed  = COMPLETE

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
    and
    incomplete_checkpoint_count = 0;

end;
$function$;
