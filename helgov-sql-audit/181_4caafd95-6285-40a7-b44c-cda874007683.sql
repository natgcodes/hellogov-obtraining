│
◇  Downloading snippet...
create or replace function public.trainer_reset_learner_progress(
  target_learner_id uuid,
  target_program_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- -------------------------------------------------------
  -- SECURITY
  -- -------------------------------------------------------

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_trainer() then
    raise exception 'Trainer access required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_learner_id
  ) then
    raise exception 'Trainee not found';
  end if;

  if not exists (
    select 1
    from public.programs
    where id = target_program_id
  ) then
    raise exception 'Program not found';
  end if;

  -- -------------------------------------------------------
  -- QUIZ ANSWER MATCHES
  -- -------------------------------------------------------

  delete from public.quiz_answer_matches
  where answer_id in (
    select qa.id
    from public.quiz_answers qa
    join public.quiz_attempts qatt
      on qatt.id = qa.attempt_id
    join public.quizzes q
      on q.id = qatt.quiz_id
    left join public.modules m
      on m.id = q.module_id
    left join public.days d
      on d.id = m.day_id
    left join public.checkpoints cp
      on cp.quiz_id = q.id
    left join public.days cpd
      on cpd.id = cp.day_id
    where qatt.learner_id = target_learner_id
      and (
        d.program_id = target_program_id
        or cpd.program_id = target_program_id
      )
  );

  -- -------------------------------------------------------
  -- QUIZ ANSWER OPTIONS
  -- -------------------------------------------------------

  delete from public.quiz_answer_options
  where answer_id in (
    select qa.id
    from public.quiz_answers qa
    join public.quiz_attempts qatt
      on qatt.id = qa.attempt_id
    join public.quizzes q
      on q.id = qatt.quiz_id
    left join public.modules m
      on m.id = q.module_id
    left join public.days d
      on d.id = m.day_id
    left join public.checkpoints cp
      on cp.quiz_id = q.id
    left join public.days cpd
      on cpd.id = cp.day_id
    where qatt.learner_id = target_learner_id
      and (
        d.program_id = target_program_id
        or cpd.program_id = target_program_id
      )
  );

  -- -------------------------------------------------------
  -- QUIZ ANSWERS
  -- -------------------------------------------------------

  delete from public.quiz_answers
  where attempt_id in (
    select qatt.id
    from public.quiz_attempts qatt
    join public.quizzes q
      on q.id = qatt.quiz_id
    left join public.modules m
      on m.id = q.module_id
    left join public.days d
      on d.id = m.day_id
    left join public.checkpoints cp
      on cp.quiz_id = q.id
    left join public.days cpd
      on cpd.id = cp.day_id
    where qatt.learner_id = target_learner_id
      and (
        d.program_id = target_program_id
        or cpd.program_id = target_program_id
      )
  );

  -- -------------------------------------------------------
  -- QUIZ ATTEMPTS
  -- Includes normal module quizzes + checkpoint quizzes.
  -- -------------------------------------------------------

  delete from public.quiz_attempts qatt
  using public.quizzes q
  where qatt.quiz_id = q.id
    and qatt.learner_id = target_learner_id
    and (
      exists (
        select 1
        from public.modules m
        join public.days d
          on d.id = m.day_id
        where m.id = q.module_id
          and d.program_id = target_program_id
      )
      or exists (
        select 1
        from public.checkpoints cp
        join public.days d
          on d.id = cp.day_id
        where cp.quiz_id = q.id
          and d.program_id = target_program_id
      )
    );

  -- -------------------------------------------------------
  -- CHECKPOINT RESULTS
  -- -------------------------------------------------------

  delete from public.checkpoint_results cr
  using public.checkpoints cp,
        public.days d
  where cr.checkpoint_id = cp.id
    and cp.day_id = d.id
    and cr.learner_id = target_learner_id
    and d.program_id = target_program_id;

  -- -------------------------------------------------------
  -- ACTIVITY PROGRESS
  -- -------------------------------------------------------

  delete from public.learner_activity_progress lap
  using public.activities a,
        public.modules m,
        public.days d
  where lap.activity_id = a.id
    and a.module_id = m.id
    and m.day_id = d.id
    and lap.learner_id = target_learner_id
    and d.program_id = target_program_id;

  -- -------------------------------------------------------
  -- MATERIAL PROGRESS
  -- -------------------------------------------------------

  delete from public.learner_material_progress lmp
  using public.materials mat,
        public.modules m,
        public.days d
  where lmp.material_id = mat.id
    and mat.module_id = m.id
    and m.day_id = d.id
    and lmp.learner_id = target_learner_id
    and d.program_id = target_program_id;

  -- -------------------------------------------------------
  -- MODULE PROGRESS
  -- -------------------------------------------------------

  delete from public.learner_module_progress lmp
  using public.modules m,
        public.days d
  where lmp.module_id = m.id
    and m.day_id = d.id
    and lmp.learner_id = target_learner_id
    and d.program_id = target_program_id;

  -- -------------------------------------------------------
  -- TOOL SETUP PROGRESS
  -- -------------------------------------------------------

  delete from public.learner_setup_progress lsp
  using public.setup_items si
  where lsp.setup_item_id = si.id
    and lsp.learner_id = target_learner_id
    and si.program_id = target_program_id;

  -- -------------------------------------------------------
  -- CERTIFICATION COMPONENT RESULTS
  -- -------------------------------------------------------

  delete from public.certification_component_results ccr
  using public.certification_components cc,
        public.certifications c
  where ccr.component_id = cc.id
    and cc.certification_id = c.id
    and ccr.learner_id = target_learner_id
    and c.program_id = target_program_id;

  -- -------------------------------------------------------
  -- CERTIFICATION RESULT
  -- -------------------------------------------------------

  delete from public.certification_results cr
  using public.certifications c
  where cr.certification_id = c.id
    and cr.learner_id = target_learner_id
    and c.program_id = target_program_id;

  -- -------------------------------------------------------
  -- RESET ENROLLMENT
  --
  -- Keep the enrollment itself. The trainee remains assigned
  -- to the program, but returns to the initial state.
  -- -------------------------------------------------------

  update public.program_enrollments
  set
    status = 'not_started',
    started_at = null,
    completed_at = null
  where learner_id = target_learner_id
    and program_id = target_program_id;

end;
$$;

revoke all on function public.trainer_reset_learner_progress(uuid, uuid)
from public;

grant execute on function public.trainer_reset_learner_progress(uuid, uuid)
to authenticated;
