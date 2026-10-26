│
◇  Downloading snippet...
-- ============================================================
-- QUERY 97
-- Fix recalculate_program_enrollment(program, learner)
--
-- Changes:
-- 1. Makes the function safe for internal trigger execution.
-- 2. Uses the real checkpoint_results statuses.
-- 3. Counts a checkpoint as completed only when:
--      status = 'completed'
--      passed = true
-- ============================================================

create or replace function public.recalculate_program_enrollment(
  target_program_id uuid,
  target_learner_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_total_items integer := 0;
  v_completed_items integer := 0;
  v_progress numeric := 0;
  v_status text := 'not_started';
begin

  -- ==========================================================
  -- VALIDATE ENROLLMENT
  -- ==========================================================

  if not exists (
    select 1
    from public.program_enrollments pe
    where pe.program_id = target_program_id
      and pe.learner_id = target_learner_id
  ) then
    return;
  end if;


  -- ==========================================================
  -- REQUIRED SETUP ITEMS
  -- ==========================================================

  v_total_items :=
    v_total_items +
    (
      select count(*)
      from public.setup_items si
      where si.program_id = target_program_id
        and si.is_required = true
    );

  v_completed_items :=
    v_completed_items +
    (
      select count(*)
      from public.setup_items si
      join public.learner_setup_progress lsp
        on lsp.setup_item_id = si.id
      where si.program_id = target_program_id
        and si.is_required = true
        and lsp.learner_id = target_learner_id
        and lsp.completed = true
    );


  -- ==========================================================
  -- REQUIRED MODULES
  -- ==========================================================

  v_total_items :=
    v_total_items +
    (
      select count(*)
      from public.modules m
      join public.days d
        on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
    );

  v_completed_items :=
    v_completed_items +
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
        and lmp.learner_id = target_learner_id
        and lmp.status = 'completed'
    );


  -- ==========================================================
  -- REQUIRED CHECKPOINTS
  -- ==========================================================

  v_total_items :=
    v_total_items +
    (
      select count(*)
      from public.checkpoints c
      join public.days d
        on d.id = c.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and c.is_required = true
    );

  v_completed_items :=
    v_completed_items +
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
        and cr.learner_id = target_learner_id
        and cr.status = 'completed'
        and cr.passed = true
    );


  -- ==========================================================
  -- PROGRESS
  -- ==========================================================

  if v_total_items > 0 then
    v_progress :=
      round(
        (
          v_completed_items::numeric
          /
          v_total_items::numeric
        ) * 100,
        2
      );
  else
    v_progress := 0;
  end if;


  -- ==========================================================
  -- ENROLLMENT STATUS
  -- ==========================================================

  if
    v_total_items > 0
    and v_completed_items >= v_total_items
  then
    v_status := 'completed';

  elsif v_completed_items > 0 then
    v_status := 'in_progress';

  else
    v_status := 'not_started';
  end if;


  -- ==========================================================
  -- UPDATE ENROLLMENT
  -- ==========================================================

  update public.program_enrollments pe
  set
    status = v_status,

    started_at =
      case
        when v_status <> 'not_started'
        then coalesce(
          pe.started_at,
          now()
        )
        else pe.started_at
      end,

    completed_at =
      case
        when v_status = 'completed'
        then coalesce(
          pe.completed_at,
          now()
        )
        else null
      end

  where pe.program_id = target_program_id
    and pe.learner_id = target_learner_id;

end;
$function$;
