│
◇  Downloading snippet...
-- ============================================================
-- 20 - LEARNER PROGRESS ENGINE
-- HelloGov Onboarding
-- ============================================================

begin;

-- ============================================================
-- 1. PREVENT DUPLICATE PROGRESS RECORDS
-- ============================================================

create unique index if not exists
  program_enrollments_program_learner_uidx
on public.program_enrollments(program_id, learner_id);

create unique index if not exists
  learner_setup_progress_learner_item_uidx
on public.learner_setup_progress(learner_id, setup_item_id);

create unique index if not exists
  learner_material_progress_learner_material_uidx
on public.learner_material_progress(learner_id, material_id);

create unique index if not exists
  learner_activity_progress_learner_activity_uidx
on public.learner_activity_progress(learner_id, activity_id);

create unique index if not exists
  learner_module_progress_learner_module_uidx
on public.learner_module_progress(learner_id, module_id);

create unique index if not exists
  certification_results_cert_learner_uidx
on public.certification_results(
  certification_id,
  learner_id
);

create unique index if not exists
  certification_component_results_component_learner_uidx
on public.certification_component_results(
  component_id,
  learner_id
);

-- ============================================================
-- 2. ENABLE RLS
-- ============================================================

alter table public.program_enrollments
  enable row level security;

alter table public.learner_setup_progress
  enable row level security;

alter table public.learner_material_progress
  enable row level security;

alter table public.learner_activity_progress
  enable row level security;

alter table public.learner_module_progress
  enable row level security;

alter table public.certification_results
  enable row level security;

alter table public.certification_component_results
  enable row level security;

-- ============================================================
-- 3. NORMALIZE PROGRESS POLICIES
-- ============================================================

do $$
declare
  target_table text;
  policy_record record;
begin

  foreach target_table in array array[
    'program_enrollments',
    'learner_setup_progress',
    'learner_material_progress',
    'learner_activity_progress',
    'learner_module_progress',
    'certification_results',
    'certification_component_results'
  ]
  loop

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop

      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        target_table
      );

    end loop;

  end loop;

end
$$;

-- ============================================================
-- 4. ENROLLMENTS
-- ============================================================

create policy "trainer manage enrollments"
on public.program_enrollments
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "learner read own enrollment"
on public.program_enrollments
for select
to authenticated
using (
  learner_id = auth.uid()
);

-- ============================================================
-- 5. SETUP PROGRESS
-- ============================================================

create policy "trainer manage setup progress"
on public.learner_setup_progress
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "learner read own setup progress"
on public.learner_setup_progress
for select
to authenticated
using (
  learner_id = auth.uid()
);

-- ============================================================
-- 6. MATERIAL PROGRESS
-- ============================================================

create policy "trainer manage material progress"
on public.learner_material_progress
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "learner read own material progress"
on public.learner_material_progress
for select
to authenticated
using (
  learner_id = auth.uid()
);

-- ============================================================
-- 7. ACTIVITY PROGRESS
-- ============================================================

create policy "trainer manage activity progress"
on public.learner_activity_progress
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "learner read own activity progress"
on public.learner_activity_progress
for select
to authenticated
using (
  learner_id = auth.uid()
);

-- ============================================================
-- 8. MODULE PROGRESS
-- ============================================================

create policy "trainer manage module progress"
on public.learner_module_progress
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "learner read own module progress"
on public.learner_module_progress
for select
to authenticated
using (
  learner_id = auth.uid()
);

-- ============================================================
-- 9. CERTIFICATION RESULTS
-- Learner can read. Trainer controls grading.
-- ============================================================

create policy "trainer manage certification results"
on public.certification_results
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "learner read own certification result"
on public.certification_results
for select
to authenticated
using (
  learner_id = auth.uid()
);

create policy "trainer manage certification components"
on public.certification_component_results
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());

create policy "learner read own certification components"
on public.certification_component_results
for select
to authenticated
using (
  learner_id = auth.uid()
);

-- ============================================================
-- 10. ENROLL CURRENT LEARNER
--
-- Used when learner enters a published program.
-- ============================================================

drop function if exists
  public.ensure_program_enrollment(uuid);

create function public.ensure_program_enrollment(
  target_program_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  enrollment_id uuid;
begin

  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if public.is_trainer() then
    raise exception 'Learner account required';
  end if;

  if not exists (
    select 1
    from public.programs
    where id = target_program_id
      and status = 'published'
  ) then
    raise exception 'Program is not available';
  end if;

  insert into public.program_enrollments (
    program_id,
    learner_id,
    status,
    enrolled_at,
    started_at
  )
  values (
    target_program_id,
    current_user_id,
    'in_progress',
    now(),
    now()
  )
  on conflict (program_id, learner_id)
  do update set
    started_at = coalesce(
      public.program_enrollments.started_at,
      now()
    )
  returning id into enrollment_id;

  return enrollment_id;

end;
$$;

revoke all
on function public.ensure_program_enrollment(uuid)
from public;

grant execute
on function public.ensure_program_enrollment(uuid)
to authenticated;

-- ============================================================
-- 11. COMPLETE / UNCOMPLETE SETUP ITEM
-- ============================================================

drop function if exists
  public.set_setup_item_complete(uuid, boolean);

create function public.set_setup_item_complete(
  target_setup_item_id uuid,
  target_completed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.setup_items si
    join public.programs p
      on p.id = si.program_id
    where si.id = target_setup_item_id
      and p.status = 'published'
  ) then
    raise exception 'Setup item is not available';
  end if;

  insert into public.learner_setup_progress (
    learner_id,
    setup_item_id,
    completed,
    completed_at
  )
  values (
    auth.uid(),
    target_setup_item_id,
    target_completed,
    case
      when target_completed then now()
      else null
    end
  )
  on conflict (learner_id, setup_item_id)
  do update set
    completed = excluded.completed,
    completed_at = excluded.completed_at;

end;
$$;

revoke all
on function public.set_setup_item_complete(uuid, boolean)
from public;

grant execute
on function public.set_setup_item_complete(uuid, boolean)
to authenticated;

-- ============================================================
-- 12. COMPLETE / UNCOMPLETE MATERIAL
-- ============================================================

drop function if exists
  public.set_material_complete(uuid, boolean);

create function public.set_material_complete(
  target_material_id uuid,
  target_completed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.materials ma
    join public.modules m
      on m.id = ma.module_id
    join public.days d
      on d.id = m.day_id
    join public.programs p
      on p.id = d.program_id
    where ma.id = target_material_id
      and d.is_published = true
      and p.status = 'published'
  ) then
    raise exception 'Material is not available';
  end if;

  insert into public.learner_material_progress (
    learner_id,
    material_id,
    completed,
    completed_at
  )
  values (
    auth.uid(),
    target_material_id,
    target_completed,
    case
      when target_completed then now()
      else null
    end
  )
  on conflict (learner_id, material_id)
  do update set
    completed = excluded.completed,
    completed_at = excluded.completed_at;

end;
$$;

revoke all
on function public.set_material_complete(uuid, boolean)
from public;

grant execute
on function public.set_material_complete(uuid, boolean)
to authenticated;

-- ============================================================
-- 13. ACTIVITY PROGRESS
-- ============================================================

drop function if exists
  public.set_activity_status(uuid, text, text);

create function public.set_activity_status(
  target_activity_id uuid,
  target_status text,
  target_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_status not in (
    'not_started',
    'in_progress',
    'completed'
  ) then
    raise exception 'Invalid activity status';
  end if;

  if not exists (
    select 1
    from public.activities a
    join public.modules m
      on m.id = a.module_id
    join public.days d
      on d.id = m.day_id
    join public.programs p
      on p.id = d.program_id
    where a.id = target_activity_id
      and d.is_published = true
      and p.status = 'published'
  ) then
    raise exception 'Activity is not available';
  end if;

  insert into public.learner_activity_progress (
    learner_id,
    activity_id,
    status,
    learner_notes,
    completed_at,
    updated_at
  )
  values (
    auth.uid(),
    target_activity_id,
    target_status,
    target_notes,
    case
      when target_status = 'completed'
        then now()
      else null
    end,
    now()
  )
  on conflict (learner_id, activity_id)
  do update set
    status = excluded.status,
    learner_notes = excluded.learner_notes,
    completed_at = excluded.completed_at,
    updated_at = now();

end;
$$;

revoke all
on function public.set_activity_status(
  uuid,
  text,
  text
)
from public;

grant execute
on function public.set_activity_status(
  uuid,
  text,
  text
)
to authenticated;

-- ============================================================
-- 14. RECALCULATE MODULE PROGRESS
--
-- A required module is complete when:
-- - all required materials are complete
-- - all required activities are complete
-- - all required published quizzes have a passed attempt
-- ============================================================

drop function if exists
  public.recalculate_module_progress(uuid);

create function public.recalculate_module_progress(
  target_module_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;

  required_materials int := 0;
  completed_materials int := 0;

  required_activities int := 0;
  completed_activities int := 0;

  required_quizzes int := 0;
  passed_quizzes int := 0;

  final_status text;
begin

  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- --------------------------------------------
  -- MATERIALS
  -- --------------------------------------------

  select count(*)
  into required_materials
  from public.materials
  where module_id = target_module_id
    and is_required = true;

  select count(*)
  into completed_materials
  from public.materials ma
  join public.learner_material_progress lmp
    on lmp.material_id = ma.id
  where ma.module_id = target_module_id
    and ma.is_required = true
    and lmp.learner_id = current_user_id
    and lmp.completed = true;

  -- --------------------------------------------
  -- ACTIVITIES
  -- --------------------------------------------

  select count(*)
  into required_activities
  from public.activities
  where module_id = target_module_id
    and is_required = true;

  select count(*)
  into completed_activities
  from public.activities a
  join public.learner_activity_progress lap
    on lap.activity_id = a.id
  where a.module_id = target_module_id
    and a.is_required = true
    and lap.learner_id = current_user_id
    and lap.status = 'completed';

  -- --------------------------------------------
  -- QUIZZES
  -- --------------------------------------------

  select count(*)
  into required_quizzes
  from public.quizzes
  where module_id = target_module_id
    and is_required = true
    and is_published = true;

  select count(*)
  into passed_quizzes
  from public.quizzes q
  where q.module_id = target_module_id
    and q.is_required = true
    and q.is_published = true
    and exists (
      select 1
      from public.quiz_attempts qa
      where qa.quiz_id = q.id
        and qa.learner_id = current_user_id
        and qa.status = 'graded'
        and qa.passed = true
    );

  -- --------------------------------------------
  -- STATUS
  -- --------------------------------------------

  if
    completed_materials >= required_materials
    and completed_activities >= required_activities
    and passed_quizzes >= required_quizzes
  then

    final_status := 'completed';

  elsif
    completed_materials > 0
    or completed_activities > 0
    or exists (
      select 1
      from public.quiz_attempts qa
      join public.quizzes q
        on q.id = qa.quiz_id
      where q.module_id = target_module_id
        and qa.learner_id = current_user_id
    )
  then

    final_status := 'in_progress';

  else

    final_status := 'not_started';

  end if;

  -- --------------------------------------------
  -- UPSERT
  -- --------------------------------------------

  insert into public.learner_module_progress (
    learner_id,
    module_id,
    status,
    started_at,
    completed_at,
    updated_at
  )
  values (
    current_user_id,
    target_module_id,
    final_status,

    case
      when final_status <> 'not_started'
        then now()
      else null
    end,

    case
      when final_status = 'completed'
        then now()
      else null
    end,

    now()
  )
  on conflict (learner_id, module_id)
  do update set

    status = excluded.status,

    started_at =
      case
        when public.learner_module_progress.started_at
          is not null
        then public.learner_module_progress.started_at

        when excluded.status <> 'not_started'
        then now()

        else null
      end,

    completed_at =
      case
        when excluded.status = 'completed'
        then coalesce(
          public.learner_module_progress.completed_at,
          now()
        )
        else null
      end,

    updated_at = now();

  return final_status;

end;
$$;

revoke all
on function public.recalculate_module_progress(uuid)
from public;

grant execute
on function public.recalculate_module_progress(uuid)
to authenticated;

-- ============================================================
-- 15. IS DAY COMPLETE?
-- ============================================================

drop function if exists
  public.is_day_complete(uuid);

create function public.is_day_complete(
  target_day_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.modules m
    where m.day_id = target_day_id
      and m.is_required = true
      and not exists (
        select 1
        from public.learner_module_progress lmp
        where lmp.module_id = m.id
          and lmp.learner_id = auth.uid()
          and lmp.status = 'completed'
      )
  );
$$;

revoke all
on function public.is_day_complete(uuid)
from public;

grant execute
on function public.is_day_complete(uuid)
to authenticated;

-- ============================================================
-- 16. IS DAY UNLOCKED?
--
-- Day 1:
-- all required setup items must be complete.
--
-- Later days:
-- previous published day must be complete.
-- ============================================================

drop function if exists
  public.is_day_unlocked(uuid);

create function public.is_day_unlocked(
  target_day_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_day record;
  previous_day_id uuid;
begin

  if auth.uid() is null then
    return false;
  end if;

  select *
  into target_day
  from public.days
  where id = target_day_id
    and is_published = true;

  if target_day.id is null then
    return false;
  end if;

  -- Day 1 / first published day.
  select d.id
  into previous_day_id
  from public.days d
  where d.program_id = target_day.program_id
    and d.is_published = true
    and (
      d.position < target_day.position
      or (
        d.position = target_day.position
        and d.day_number < target_day.day_number
      )
    )
  order by
    d.position desc,
    d.day_number desc
  limit 1;

  if previous_day_id is null then

    return not exists (
      select 1
      from public.setup_items si
      where si.program_id = target_day.program_id
        and si.is_required = true
        and not exists (
          select 1
          from public.learner_setup_progress lsp
          where lsp.setup_item_id = si.id
            and lsp.learner_id = auth.uid()
            and lsp.completed = true
        )
    );

  end if;

  return public.is_day_complete(previous_day_id);

end;
$$;

revoke all
on function public.is_day_unlocked(uuid)
from public;

grant execute
on function public.is_day_unlocked(uuid)
to authenticated;

-- ============================================================
-- 17. PROGRAM PROGRESS %
--
-- Based on required setup + required modules.
-- ============================================================

drop function if exists
  public.get_program_progress(uuid);

create function public.get_program_progress(
  target_program_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  total_items int := 0;
  completed_items int := 0;
begin

  -- Required setup
  select count(*)
  into total_items
  from public.setup_items
  where program_id = target_program_id
    and is_required = true;

  select count(*)
  into completed_items
  from public.setup_items si
  join public.learner_setup_progress lsp
    on lsp.setup_item_id = si.id
  where si.program_id = target_program_id
    and si.is_required = true
    and lsp.learner_id = auth.uid()
    and lsp.completed = true;

  -- Required modules
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
$$;

revoke all
on function public.get_program_progress(uuid)
from public;

grant execute
on function public.get_program_progress(uuid)
to authenticated;

-- ============================================================
-- 18. MARK PROGRAM COMPLETE WHEN APPROPRIATE
-- ============================================================

drop function if exists
  public.recalculate_program_enrollment(uuid);

create function public.recalculate_program_enrollment(
  target_program_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  progress_value numeric;
  final_status text;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  progress_value :=
    public.get_program_progress(target_program_id);

  if progress_value >= 100 then
    final_status := 'completed';
  elsif progress_value > 0 then
    final_status := 'in_progress';
  else
    final_status := 'not_started';
  end if;

  update public.program_enrollments
  set
    status = final_status,

    started_at =
      case
        when final_status <> 'not_started'
        then coalesce(started_at, now())
        else started_at
      end,

    completed_at =
      case
        when final_status = 'completed'
        then coalesce(completed_at, now())
        else null
      end
  where program_id = target_program_id
    and learner_id = auth.uid();

  return final_status;

end;
$$;

revoke all
on function public.recalculate_program_enrollment(uuid)
from public;

grant execute
on function public.recalculate_program_enrollment(uuid)
to authenticated;

-- ============================================================
-- 19. VERIFICATION
-- ============================================================

do $$
begin
  raise notice
    '20 - Learner Progress Engine completed successfully.';
end
$$;

commit;
