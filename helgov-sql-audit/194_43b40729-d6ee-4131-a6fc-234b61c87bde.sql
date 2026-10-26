│
◇  Downloading snippet...
-- ============================================================
-- QUERY 44
-- TRAINER IMPERSONATION: PROGRESS + JOURNEY
-- ============================================================
--
-- These functions allow an authenticated trainer to READ
-- another trainee's onboarding state without changing sessions.
--
-- They do NOT modify progress.
-- They do NOT impersonate auth.uid().
-- They are trainer-only.
-- ============================================================


-- ============================================================
-- 1. PROGRAM PROGRESS FOR A SPECIFIC TRAINEE
-- ============================================================

create or replace function public.get_trainer_impersonated_progress(
  target_program_id uuid,
  target_learner_id uuid
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

  -- ----------------------------------------------------------
  -- SECURITY
  -- ----------------------------------------------------------

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;


  -- ----------------------------------------------------------
  -- REQUIRED SETUP ITEMS
  -- ----------------------------------------------------------

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
        and lsp.learner_id = target_learner_id
        and lsp.completed = true
    );


  -- ----------------------------------------------------------
  -- REQUIRED MODULES
  -- ----------------------------------------------------------

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
        and lmp.learner_id = target_learner_id
        and lmp.status = 'completed'
    );


  -- ----------------------------------------------------------
  -- REQUIRED CHECKPOINTS
  -- ----------------------------------------------------------

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
        and cr.learner_id = target_learner_id
        and cr.status = 'completed'
        and cr.passed = true
    );


  -- ----------------------------------------------------------
  -- RESULT
  -- ----------------------------------------------------------

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


-- ============================================================
-- 2. JOURNEY DAY STATES FOR A SPECIFIC TRAINEE
-- ============================================================

create or replace function public.get_trainer_impersonated_journey_days(
  target_program_id uuid,
  target_learner_id uuid
)
returns table(
  id uuid,
  day_number integer,
  title text,
  unlocked boolean,
  completed boolean
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

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;


  -- ----------------------------------------------------------
  -- JOURNEY
  -- ----------------------------------------------------------

  return query

  with published_days as (
    select
      d.id,
      d.day_number,
      d.title,
      d.position,

      (
        (
          exists (
            select 1
            from public.modules m
            where m.day_id = d.id
              and m.is_required = true
          )
          or
          exists (
            select 1
            from public.checkpoints c
            where c.day_id = d.id
              and c.is_required = true
          )
        )

        and

        not exists (
          select 1
          from public.modules m
          where m.day_id = d.id
            and m.is_required = true
            and not exists (
              select 1
              from public.learner_module_progress lmp
              where lmp.module_id = m.id
                and lmp.learner_id = target_learner_id
                and lmp.status = 'completed'
            )
        )

        and

        not exists (
          select 1
          from public.checkpoints c
          where c.day_id = d.id
            and c.is_required = true
            and not exists (
              select 1
              from public.checkpoint_results cr
              where cr.checkpoint_id = c.id
                and cr.learner_id = target_learner_id
                and cr.status = 'completed'
                and cr.passed = true
            )
        )
      ) as completed

    from public.days d
    where d.program_id = target_program_id
      and d.is_published = true
  ),

  ordered_days as (
    select
      pd.*,

      lag(pd.completed) over (
        order by
          pd.position,
          pd.day_number
      ) as previous_day_completed,

      row_number() over (
        order by
          pd.position,
          pd.day_number
      ) as day_sequence

    from published_days pd
  )

  select
    od.id,
    od.day_number,
    od.title,

    case
      when od.day_sequence = 1 then true

      else coalesce(
        od.previous_day_completed,
        false
      )
    end as unlocked,

    od.completed

  from ordered_days od

  order by
    od.position,
    od.day_number;

end;
$function$;


-- ============================================================
-- 3. PERMISSIONS
-- ============================================================

revoke all
on function public.get_trainer_impersonated_progress(uuid, uuid)
from public;

revoke all
on function public.get_trainer_impersonated_journey_days(uuid, uuid)
from public;


grant execute
on function public.get_trainer_impersonated_progress(uuid, uuid)
to authenticated;

grant execute
on function public.get_trainer_impersonated_journey_days(uuid, uuid)
to authenticated;
