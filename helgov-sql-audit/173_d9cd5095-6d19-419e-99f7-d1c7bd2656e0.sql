│
◇  Downloading snippet...
-- ============================================================
-- 1. DAY COMPLETION
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
        and cr.status = 'completed'

        and (
          -- Assessments must actually be passed.
          (
            c.checkpoint_type = 'assessment'
            and cr.passed = true
          )

          or

          -- Non-assessment checkpoints only need completion.
          (
            c.checkpoint_type in (
              'trainer_session',
              'information'
            )
          )
        )
    );


  -- ==========================================================
  -- EMPTY DAY
  -- ==========================================================

  if
    required_module_count = 0
    and required_checkpoint_count = 0
  then
    return false;
  end if;


  -- ==========================================================
  -- FINAL RESULT
  -- ==========================================================

  return
    incomplete_module_count = 0
    and
    incomplete_checkpoint_count = 0;

end;
$function$;



-- ============================================================
-- 2. LEARNER JOURNEY + DAY UNLOCKING
-- ============================================================

create or replace function public.get_learner_journey_days(
  target_program_id uuid
)
returns table(
  id uuid,
  day_number integer,
  title text,
  unlocked boolean,
  completed boolean
)
language sql
stable
security definer
set search_path = ''
as $function$

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
                and lmp.learner_id = auth.uid()
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
                and cr.learner_id = auth.uid()
                and cr.status = 'completed'

                and (
                  (
                    c.checkpoint_type = 'assessment'
                    and cr.passed = true
                  )

                  or

                  (
                    c.checkpoint_type in (
                      'trainer_session',
                      'information'
                    )
                  )
                )
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
      when od.day_sequence = 1
      then true

      else coalesce(
        od.previous_day_completed,
        false
      )
    end as unlocked,

    od.completed

  from ordered_days od

  where auth.uid() is not null

  order by
    od.position,
    od.day_number;

$function$;



-- ============================================================
-- 3. TRAINER IMPERSONATION JOURNEY
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

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;


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

                and (
                  (
                    c.checkpoint_type = 'assessment'
                    and cr.passed = true
                  )

                  or

                  (
                    c.checkpoint_type in (
                      'trainer_session',
                      'information'
                    )
                  )
                )
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
      when od.day_sequence = 1
      then true

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
