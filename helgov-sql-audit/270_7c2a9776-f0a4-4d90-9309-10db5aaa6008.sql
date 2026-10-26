│
◇  Downloading snippet...
-- ============================================================
-- QUERY 79
-- get_trainer_learner_setup_progress
--
-- Trainer-facing setup progress for one learner
-- in one program.
--
-- Returns one row per setup item.
-- ============================================================

drop function if exists public.get_trainer_learner_setup_progress(uuid, uuid);

create function public.get_trainer_learner_setup_progress(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  setup_item_id uuid,
  setup_title text,
  setup_description text,
  setup_position integer,
  is_required boolean,

  completed boolean,
  completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin

  -- ----------------------------------------------------------
  -- SECURITY
  -- ----------------------------------------------------------

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  -- ----------------------------------------------------------
  -- VALIDATE LEARNER ENROLLMENT
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.program_enrollments pe
    where pe.program_id = target_program_id
      and pe.learner_id = target_learner_id
  ) then
    raise exception 'Learner is not enrolled in this program';
  end if;

  -- ----------------------------------------------------------
  -- SETUP PROGRESS
  -- ----------------------------------------------------------

  return query
  select
    si.id as setup_item_id,
    si.title as setup_title,
    si.description as setup_description,
    si.position as setup_position,
    si.is_required,

    coalesce(
      lsp.completed,
      false
    ) as completed,

    lsp.completed_at

  from public.setup_items si

  left join public.learner_setup_progress lsp
    on lsp.setup_item_id = si.id
    and lsp.learner_id = target_learner_id

  where si.program_id = target_program_id

  order by
    si.position,
    si.title;

end;
$function$;
