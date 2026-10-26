│
◇  Downloading snippet...
-- ============================================================
-- 21 - TRAINER OPERATIONS & CERTIFICATION ENGINE
-- HelloGov Onboarding
-- ============================================================

begin;

-- ============================================================
-- 1. TRAINER: SET PROGRAM STATUS
-- ============================================================

drop function if exists public.set_program_status(uuid, text);

create function public.set_program_status(
  target_program_id uuid,
  target_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  if target_status not in ('draft', 'published') then
    raise exception 'Invalid program status';
  end if;

  update public.programs
  set status = target_status
  where id = target_program_id;

  if not found then
    raise exception 'Program not found';
  end if;
end;
$$;

revoke all
on function public.set_program_status(uuid, text)
from public;

grant execute
on function public.set_program_status(uuid, text)
to authenticated;

-- ============================================================
-- 2. TRAINER: SET DAY PUBLISHED STATE
-- ============================================================

drop function if exists public.set_day_published(uuid, boolean);

create function public.set_day_published(
  target_day_id uuid,
  target_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  update public.days
  set is_published = target_published
  where id = target_day_id;

  if not found then
    raise exception 'Day not found';
  end if;
end;
$$;

revoke all
on function public.set_day_published(uuid, boolean)
from public;

grant execute
on function public.set_day_published(uuid, boolean)
to authenticated;

-- ============================================================
-- 3. TRAINER: SET QUIZ PUBLISHED STATE
-- ============================================================

drop function if exists public.set_quiz_published(uuid, boolean);

create function public.set_quiz_published(
  target_quiz_id uuid,
  target_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  update public.quizzes
  set
    is_published = target_published,
    updated_at = now()
  where id = target_quiz_id;

  if not found then
    raise exception 'Quiz not found';
  end if;
end;
$$;

revoke all
on function public.set_quiz_published(uuid, boolean)
from public;

grant execute
on function public.set_quiz_published(uuid, boolean)
to authenticated;

-- ============================================================
-- 4. TRAINER: LEARNER OVERVIEW
-- ============================================================

drop function if exists public.get_trainer_learners(uuid);

create function public.get_trainer_learners(
  target_program_id uuid
)
returns table (
  learner_id uuid,
  full_name text,
  email text,
  enrollment_status text,
  enrolled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  progress_percent numeric,
  completed_modules bigint,
  total_modules bigint,
  passed_quizzes bigint,
  total_quizzes bigint,
  needs_review bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  return query
  select
    pe.learner_id,
    pr.full_name,
    pr.email,
    pe.status,
    pe.enrolled_at,
    pe.started_at,
    pe.completed_at,

    case
      when (
        (
          select count(*)
          from public.setup_items si
          where si.program_id = target_program_id
            and si.is_required = true
        )
        +
        (
          select count(*)
          from public.modules m
          join public.days d on d.id = m.day_id
          where d.program_id = target_program_id
            and d.is_published = true
            and m.is_required = true
        )
      ) = 0
      then 0::numeric

      else round(
        (
          (
            select count(*)
            from public.learner_setup_progress lsp
            join public.setup_items si
              on si.id = lsp.setup_item_id
            where lsp.learner_id = pe.learner_id
              and si.program_id = target_program_id
              and si.is_required = true
              and lsp.completed = true
          )
          +
          (
            select count(*)
            from public.learner_module_progress lmp
            join public.modules m
              on m.id = lmp.module_id
            join public.days d
              on d.id = m.day_id
            where lmp.learner_id = pe.learner_id
              and d.program_id = target_program_id
              and d.is_published = true
              and m.is_required = true
              and lmp.status = 'completed'
          )
        )::numeric
        /
        (
          (
            select count(*)
            from public.setup_items si
            where si.program_id = target_program_id
              and si.is_required = true
          )
          +
          (
            select count(*)
            from public.modules m
            join public.days d
              on d.id = m.day_id
            where d.program_id = target_program_id
              and d.is_published = true
              and m.is_required = true
          )
        )::numeric
        * 100,
        2
      )
    end as progress_percent,

    (
      select count(*)
      from public.learner_module_progress lmp
      join public.modules m on m.id = lmp.module_id
      join public.days d on d.id = m.day_id
      where lmp.learner_id = pe.learner_id
        and d.program_id = target_program_id
        and lmp.status = 'completed'
    ) as completed_modules,

    (
      select count(*)
      from public.modules m
      join public.days d on d.id = m.day_id
      where d.program_id = target_program_id
        and d.is_published = true
        and m.is_required = true
    ) as total_modules,

    (
      select count(distinct qa.quiz_id)
      from public.quiz_attempts qa
      join public.quizzes q on q.id = qa.quiz_id
      join public.modules m on m.id = q.module_id
      join public.days d on d.id = m.day_id
      where qa.learner_id = pe.learner_id
        and d.program_id = target_program_id
        and qa.status = 'graded'
        and qa.passed = true
    ) as passed_quizzes,

    (
      select count(*)
      from public.quizzes q
      join public.modules m on m.id = q.module_id
      join public.days d on d.id = m.day_id
      where d.program_id = target_program_id
        and q.is_published = true
        and q.is_required = true
    ) as total_quizzes,

    (
      select count(*)
      from public.quiz_attempts qa
      join public.quizzes q on q.id = qa.quiz_id
      join public.modules m on m.id = q.module_id
      join public.days d on d.id = m.day_id
      where qa.learner_id = pe.learner_id
        and d.program_id = target_program_id
        and qa.status = 'needs_review'
    ) as needs_review

  from public.program_enrollments pe
  join public.profiles pr
    on pr.id = pe.learner_id
  where pe.program_id = target_program_id
  order by
    pe.completed_at desc nulls last,
    pe.started_at desc nulls last,
    pr.full_name;
end;
$$;

revoke all
on function public.get_trainer_learners(uuid)
from public;

grant execute
on function public.get_trainer_learners(uuid)
to authenticated;

-- ============================================================
-- 5. TRAINER: REVIEW QUEUE
-- ============================================================

drop function if exists public.get_quiz_review_queue(uuid);

create function public.get_quiz_review_queue(
  target_program_id uuid
)
returns table (
  attempt_id uuid,
  learner_id uuid,
  learner_name text,
  learner_email text,
  quiz_id uuid,
  quiz_title text,
  submitted_at timestamptz,
  current_score numeric,
  pending_answers bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  return query
  select
    qa.id,
    qa.learner_id,
    p.full_name,
    p.email,
    q.id,
    q.title,
    qa.submitted_at,
    qa.score,

    (
      select count(*)
      from public.quiz_answers ans
      join public.quiz_questions qq
        on qq.id = ans.question_id
      where ans.attempt_id = qa.id
        and qq.question_type in (
          'open_text',
          'file_upload'
        )
        and ans.points_awarded is null
    ) as pending_answers

  from public.quiz_attempts qa
  join public.profiles p
    on p.id = qa.learner_id
  join public.quizzes q
    on q.id = qa.quiz_id
  join public.modules m
    on m.id = q.module_id
  join public.days d
    on d.id = m.day_id

  where d.program_id = target_program_id
    and qa.status = 'needs_review'

  order by qa.submitted_at asc;
end;
$$;

revoke all
on function public.get_quiz_review_queue(uuid)
from public;

grant execute
on function public.get_quiz_review_queue(uuid)
to authenticated;

-- ============================================================
-- 6. TRAINER: CERTIFICATION COMPONENT GRADING
-- ============================================================

drop function if exists
  public.grade_certification_component(
    uuid,
    uuid,
    numeric,
    boolean,
    text
  );

create function public.grade_certification_component(
  target_component_id uuid,
  target_learner_id uuid,
  target_score numeric,
  target_passed boolean,
  target_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_id uuid;
begin
  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  if target_score < 0 or target_score > 100 then
    raise exception 'Score must be between 0 and 100';
  end if;

  if not exists (
    select 1
    from public.certification_components
    where id = target_component_id
  ) then
    raise exception 'Certification component not found';
  end if;

  insert into public.certification_component_results (
    component_id,
    learner_id,
    score,
    passed,
    trainer_notes,
    completed_at
  )
  values (
    target_component_id,
    target_learner_id,
    target_score,
    target_passed,
    target_notes,
    now()
  )

  on conflict (component_id, learner_id)
  do update set
    score = excluded.score,
    passed = excluded.passed,
    trainer_notes = excluded.trainer_notes,
    completed_at = now()

  returning id into result_id;

  return result_id;
end;
$$;

revoke all
on function public.grade_certification_component(
  uuid,
  uuid,
  numeric,
  boolean,
  text
)
from public;

grant execute
on function public.grade_certification_component(
  uuid,
  uuid,
  numeric,
  boolean,
  text
)
to authenticated;

-- ============================================================
-- 7. RECALCULATE CERTIFICATION
-- ============================================================

drop function if exists
  public.recalculate_certification(uuid, uuid);

create function public.recalculate_certification(
  target_certification_id uuid,
  target_learner_id uuid
)
returns table (
  final_score numeric,
  passed boolean,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  certification_record record;
  total_components int;
  completed_components int;
  failed_components int;
  calculated_score numeric;
  calculated_passed boolean;
  calculated_status text;
begin

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  select *
  into certification_record
  from public.certifications
  where id = target_certification_id;

  if certification_record.id is null then
    raise exception 'Certification not found';
  end if;

  select count(*)
  into total_components
  from public.certification_components
  where certification_id = target_certification_id;

  select count(*)
  into completed_components
  from public.certification_component_results ccr
  join public.certification_components cc
    on cc.id = ccr.component_id
  where cc.certification_id = target_certification_id
    and ccr.learner_id = target_learner_id
    and ccr.completed_at is not null;

  select count(*)
  into failed_components
  from public.certification_component_results ccr
  join public.certification_components cc
    on cc.id = ccr.component_id
  where cc.certification_id = target_certification_id
    and ccr.learner_id = target_learner_id
    and ccr.passed = false;

  select coalesce(avg(ccr.score), 0)
  into calculated_score
  from public.certification_component_results ccr
  join public.certification_components cc
    on cc.id = ccr.component_id
  where cc.certification_id = target_certification_id
    and ccr.learner_id = target_learner_id;

  calculated_score := round(calculated_score, 2);

  if total_components = 0 then
    calculated_status := 'pending';
    calculated_passed := false;

  elsif completed_components < total_components then
    calculated_status := 'in_progress';
    calculated_passed := false;

  else
    calculated_passed :=
      failed_components = 0
      and calculated_score >= certification_record.passing_score;

    calculated_status :=
      case
        when calculated_passed then 'passed'
        else 'failed'
      end;
  end if;

  insert into public.certification_results (
    certification_id,
    learner_id,
    status,
    final_score,
    completed_at,
    updated_at
  )
  values (
    target_certification_id,
    target_learner_id,
    calculated_status,
    calculated_score,
    case
      when calculated_status in ('passed', 'failed')
      then now()
      else null
    end,
    now()
  )

  on conflict (certification_id, learner_id)
  do update set
    status = excluded.status,
    final_score = excluded.final_score,
    completed_at = excluded.completed_at,
    updated_at = now();

  return query
  select
    calculated_score,
    calculated_passed,
    calculated_status;
end;
$$;

revoke all
on function public.recalculate_certification(uuid, uuid)
from public;

grant execute
on function public.recalculate_certification(uuid, uuid)
to authenticated;

-- ============================================================
-- 8. TRAINER: LEARNER DETAIL SUMMARY
-- ============================================================

drop function if exists
  public.get_learner_training_summary(uuid, uuid);

create function public.get_learner_training_summary(
  target_program_id uuid,
  target_learner_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  select jsonb_build_object(

    'profile',
    (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', p.email
      )
      from public.profiles p
      where p.id = target_learner_id
    ),

    'enrollment',
    (
      select to_jsonb(pe)
      from public.program_enrollments pe
      where pe.program_id = target_program_id
        and pe.learner_id = target_learner_id
    ),

    'setup',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', si.id,
            'title', si.title,
            'required', si.is_required,
            'completed', coalesce(lsp.completed, false),
            'completed_at', lsp.completed_at
          )
          order by si.position
        )
        from public.setup_items si
        left join public.learner_setup_progress lsp
          on lsp.setup_item_id = si.id
         and lsp.learner_id = target_learner_id
        where si.program_id = target_program_id
      ),
      '[]'::jsonb
    ),

    'modules',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'title', m.title,
            'day_id', d.id,
            'day_number', d.day_number,
            'day_title', d.title,
            'required', m.is_required,
            'status', coalesce(lmp.status, 'not_started'),
            'started_at', lmp.started_at,
            'completed_at', lmp.completed_at
          )
          order by d.position, m.position
        )
        from public.modules m
        join public.days d
          on d.id = m.day_id
        left join public.learner_module_progress lmp
          on lmp.module_id = m.id
         and lmp.learner_id = target_learner_id
        where d.program_id = target_program_id
      ),
      '[]'::jsonb
    ),

    'quiz_attempts',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'attempt_id', qa.id,
            'quiz_id', q.id,
            'quiz_title', q.title,
            'attempt_number', qa.attempt_number,
            'score', qa.score,
            'passed', qa.passed,
            'status', qa.status,
            'started_at', qa.started_at,
            'submitted_at', qa.submitted_at,
            'graded_at', qa.graded_at
          )
          order by qa.started_at desc
        )
        from public.quiz_attempts qa
        join public.quizzes q
          on q.id = qa.quiz_id
        join public.modules m
          on m.id = q.module_id
        join public.days d
          on d.id = m.day_id
        where qa.learner_id = target_learner_id
          and d.program_id = target_program_id
      ),
      '[]'::jsonb
    )

  )
  into result;

  return result;
end;
$$;

revoke all
on function public.get_learner_training_summary(uuid, uuid)
from public;

grant execute
on function public.get_learner_training_summary(uuid, uuid)
to authenticated;

commit;
