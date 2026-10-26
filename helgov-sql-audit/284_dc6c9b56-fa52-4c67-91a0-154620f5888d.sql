│
◇  Downloading snippet...
-- ============================================================
-- QUERY 66
-- Include Required Checkpoints in Program Progress
-- ============================================================

create or replace function public.get_program_progress(
  target_program_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  total_items integer := 0;
  completed_items integer := 0;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  if auth.uid() is null then
    return 0;
  end if;


  -- ==========================================================
  -- REQUIRED SETUP ITEMS
  -- ==========================================================

  total_items :=
    total_items +
    (
      select count(*)
      from public.setup_items si
      where si.program_id = target_program_id
        and si.is_required = true
    );


  completed_items :=
    completed_items +
    (
      select count(*)
      from public.setup_items si
      join public.learner_setup_progress lsp
        on lsp.setup_item_id = si.id
      where si.program_id = target_program_id
        and si.is_required = true
        and lsp.learner_id = auth.uid()
        and lsp.completed = true
    );


  -- ==========================================================
  -- REQUIRED MODULES
  -- ==========================================================

  total_items :=
    total_items +
    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
    );


  completed_items :=
    completed_items +
    (
      select count(*)
      from public.learner_module_progress lmp
      join public.modules m
        on m.id = lmp.module_id
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
        and lmp.learner_id = auth.uid()
        and lmp.status = 'completed'
    );


  -- ==========================================================
  -- REQUIRED CHECKPOINTS
  -- ==========================================================

  total_items :=
    total_items +
    (
      select count(*)
      from public.checkpoints c
      join public.days d
        on d.id = c.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and c.is_required = true
    );


  completed_items :=
    completed_items +
    (
      select count(*)
      from public.checkpoint_results cr
      join public.checkpoints c
        on c.id = cr.checkpoint_id
      join public.days d
        on d.id = c.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and c.is_required = true
        and cr.learner_id = auth.uid()
        and cr.status = 'graded'
        and cr.passed = true
    );


  -- ==========================================================
  -- CALCULATE PROGRESS
  -- ==========================================================

  if total_items = 0 then
    return 0;
  end if;


  return round(
    (
      completed_items::numeric
      /
      total_items::numeric
    ) * 100,
    2
  );

end;
$function$;
