│
◇  Downloading snippet...
-- ============================================================
-- QUIZ MANUAL COMPLETION
-- ============================================================


-- ------------------------------------------------------------
-- 1. PROGRESS TABLE
-- ------------------------------------------------------------

create table if not exists public.learner_quiz_progress (
  id uuid primary key default gen_random_uuid(),

  learner_id uuid not null
    references public.profiles(id)
    on delete cascade,

  quiz_id uuid not null
    references public.quizzes(id)
    on delete cascade,

  completed boolean not null default false,

  completed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (learner_id, quiz_id)
);


-- ------------------------------------------------------------
-- 2. RLS
-- ------------------------------------------------------------

alter table public.learner_quiz_progress
enable row level security;


drop policy if exists
  "Learners can view own quiz progress"
on public.learner_quiz_progress;

create policy
  "Learners can view own quiz progress"
on public.learner_quiz_progress
for select
to authenticated
using (
  learner_id = auth.uid()
);


drop policy if exists
  "Trainers can view quiz progress"
on public.learner_quiz_progress;

create policy
  "Trainers can view quiz progress"
on public.learner_quiz_progress
for select
to authenticated
using (
  public.is_trainer()
);


-- ------------------------------------------------------------
-- 3. MARK QUIZ COMPLETE RPC
-- ------------------------------------------------------------

create or replace function public.mark_quiz_completed(
  target_quiz_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid;
  target_module_id uuid;
begin

  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;


  -- ----------------------------------------------------------
  -- VERIFY QUIZ + GET MODULE
  -- ----------------------------------------------------------

  select q.module_id
  into target_module_id
  from public.quizzes q
  where q.id = target_quiz_id
    and q.is_published = true;


  if not found then
    raise exception 'Quiz not found';
  end if;


  if target_module_id is null then
    raise exception 'This quiz does not belong to a module';
  end if;


  -- ----------------------------------------------------------
  -- SAVE MANUAL COMPLETION
  -- ----------------------------------------------------------

  insert into public.learner_quiz_progress (
    learner_id,
    quiz_id,
    completed,
    completed_at,
    updated_at
  )
  values (
    current_user_id,
    target_quiz_id,
    true,
    now(),
    now()
  )

  on conflict (learner_id, quiz_id)
  do update set
    completed = true,
    completed_at = coalesce(
      public.learner_quiz_progress.completed_at,
      now()
    ),
    updated_at = now();


  -- ----------------------------------------------------------
  -- RECALCULATE MODULE
  -- ----------------------------------------------------------

  perform public.recalculate_module_progress(
    target_module_id
  );

end;
$function$;


revoke all
on function public.mark_quiz_completed(uuid)
from public;

grant execute
on function public.mark_quiz_completed(uuid)
to authenticated;


-- ============================================================
-- 4. UPDATE MODULE RECALCULATION
--
-- A required quiz is considered complete when:
--
-- A) learner passed a real graded attempt
-- OR
-- B) learner manually marked it complete
-- ============================================================

create or replace function public.recalculate_module_progress(
  target_module_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid;

  required_materials int := 0;
  completed_materials int := 0;

  required_activities int := 0;
  completed_activities int := 0;

  required_quizzes int := 0;
  completed_quizzes int := 0;

  final_status text;
begin

  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;


  -- ----------------------------------------------------------
  -- MATERIALS
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- ACTIVITIES
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- QUIZZES
  -- ----------------------------------------------------------

  select count(*)
  into required_quizzes
  from public.quizzes
  where module_id = target_module_id
    and is_required = true
    and is_published = true;


  select count(*)
  into completed_quizzes
  from public.quizzes q
  where q.module_id = target_module_id
    and q.is_required = true
    and q.is_published = true

    and (
      -- Passed through the actual quiz
      exists (
        select 1
        from public.quiz_attempts qa
        where qa.quiz_id = q.id
          and qa.learner_id = current_user_id
          and qa.status = 'graded'
          and qa.passed = true
      )

      or

      -- Manually marked complete
      exists (
        select 1
        from public.learner_quiz_progress lqp
        where lqp.quiz_id = q.id
          and lqp.learner_id = current_user_id
          and lqp.completed = true
      )
    );


  -- ----------------------------------------------------------
  -- STATUS
  -- ----------------------------------------------------------

  if
    completed_materials >= required_materials
    and completed_activities >= required_activities
    and completed_quizzes >= required_quizzes
  then

    final_status := 'completed';

  elsif
    completed_materials > 0
    or completed_activities > 0
    or completed_quizzes > 0
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


  -- ----------------------------------------------------------
  -- UPSERT MODULE PROGRESS
  -- ----------------------------------------------------------

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
$function$;
