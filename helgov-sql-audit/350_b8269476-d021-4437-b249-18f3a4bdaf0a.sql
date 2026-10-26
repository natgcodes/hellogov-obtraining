│
◇  Downloading snippet...
-- =========================================================
-- HELLOGOV ONBOARDING
-- Security & Row Level Security Policies
-- =========================================================


-- =========================================================
-- 1. ROLE HELPER
-- Safely checks whether the current authenticated user
-- has the trainer role.
-- =========================================================

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'trainer'
  );
$$;

revoke all on function public.is_trainer() from public;
grant execute on function public.is_trainer() to authenticated;


-- =========================================================
-- 2. PROFILES
-- Learners can read their own profile.
-- Trainers can read all profiles.
-- Users cannot change their own role through the app.
-- =========================================================

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Trainers can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_trainer());

create policy "Users can update own basic profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  )
);


-- =========================================================
-- 3. PROGRAM CONTENT
-- Authenticated users can read published learning content.
-- Trainers can manage all content.
-- =========================================================

create policy "Authenticated users can read published programs"
on public.programs
for select
to authenticated
using (
  status = 'published'
  or public.is_trainer()
);


create policy "Trainers manage programs"
on public.programs
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- DAYS

create policy "Authenticated users can read available days"
on public.days
for select
to authenticated
using (
  public.is_trainer()
  or (
    is_published = true
    and exists (
      select 1
      from public.programs p
      where p.id = days.program_id
        and p.status = 'published'
    )
  )
);

create policy "Trainers manage days"
on public.days
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- =========================================================
-- 4. CHILD CONTENT
-- Learners may read content belonging to published days.
-- Trainers may manage it.
-- =========================================================

create policy "Authenticated users can read setup items"
on public.setup_items
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.programs p
    where p.id = setup_items.program_id
      and p.status = 'published'
  )
);

create policy "Trainers manage setup items"
on public.setup_items
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read modules"
on public.modules
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.days d
    join public.programs p on p.id = d.program_id
    where d.id = modules.day_id
      and d.is_published = true
      and p.status = 'published'
  )
);

create policy "Trainers manage modules"
on public.modules
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read materials"
on public.materials
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.modules m
    join public.days d on d.id = m.day_id
    join public.programs p on p.id = d.program_id
    where m.id = materials.module_id
      and d.is_published = true
      and p.status = 'published'
  )
);

create policy "Trainers manage materials"
on public.materials
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read activities"
on public.activities
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.modules m
    join public.days d on d.id = m.day_id
    join public.programs p on p.id = d.program_id
    where m.id = activities.module_id
      and d.is_published = true
      and p.status = 'published'
  )
);

create policy "Trainers manage activities"
on public.activities
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read quizzes"
on public.quizzes
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.modules m
    join public.days d on d.id = m.day_id
    join public.programs p on p.id = d.program_id
    where m.id = quizzes.module_id
      and d.is_published = true
      and p.status = 'published'
  )
);

create policy "Trainers manage quizzes"
on public.quizzes
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read quiz questions"
on public.quiz_questions
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.quizzes q
    join public.modules m on m.id = q.module_id
    join public.days d on d.id = m.day_id
    join public.programs p on p.id = d.program_id
    where q.id = quiz_questions.quiz_id
      and d.is_published = true
      and p.status = 'published'
  )
);

create policy "Trainers manage quiz questions"
on public.quiz_questions
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read quiz options"
on public.quiz_options
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.quiz_questions qq
    join public.quizzes q on q.id = qq.quiz_id
    join public.modules m on m.id = q.module_id
    join public.days d on d.id = m.day_id
    join public.programs p on p.id = d.program_id
    where qq.id = quiz_options.question_id
      and d.is_published = true
      and p.status = 'published'
  )
);

create policy "Trainers manage quiz options"
on public.quiz_options
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read checkpoints"
on public.checkpoints
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.days d
    join public.programs p on p.id = d.program_id
    where d.id = checkpoints.day_id
      and d.is_published = true
      and p.status = 'published'
  )
);

create policy "Trainers manage checkpoints"
on public.checkpoints
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- =========================================================
-- 5. CERTIFICATION + POST-TRAINING CONTENT
-- =========================================================

create policy "Authenticated users can read certifications"
on public.certifications
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.programs p
    where p.id = certifications.program_id
      and p.status = 'published'
  )
);

create policy "Trainers manage certifications"
on public.certifications
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read certification components"
on public.certification_components
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.certifications c
    join public.programs p on p.id = c.program_id
    where c.id = certification_components.certification_id
      and p.status = 'published'
  )
);

create policy "Trainers manage certification components"
on public.certification_components
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read post training"
on public.post_training
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.programs p
    where p.id = post_training.program_id
      and p.status = 'published'
  )
);

create policy "Trainers manage post training"
on public.post_training
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Authenticated users can read post training stages"
on public.post_training_stages
for select
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.post_training pt
    join public.programs p on p.id = pt.program_id
    where pt.id = post_training_stages.post_training_id
      and p.status = 'published'
  )
);

create policy "Trainers manage post training stages"
on public.post_training_stages
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


-- =========================================================
-- 6. LEARNER DATA
-- Learners can access only their own records.
-- Trainers can access all learner records.
-- =========================================================

create policy "Learners read own enrollments"
on public.program_enrollments
for select
to authenticated
using (learner_id = auth.uid() or public.is_trainer());

create policy "Trainers manage enrollments"
on public.program_enrollments
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Learners manage own setup progress"
on public.learner_setup_progress
for all
to authenticated
using (learner_id = auth.uid() or public.is_trainer())
with check (learner_id = auth.uid() or public.is_trainer());


create policy "Learners manage own module progress"
on public.learner_module_progress
for all
to authenticated
using (learner_id = auth.uid() or public.is_trainer())
with check (learner_id = auth.uid() or public.is_trainer());


create policy "Learners manage own material progress"
on public.learner_material_progress
for all
to authenticated
using (learner_id = auth.uid() or public.is_trainer())
with check (learner_id = auth.uid() or public.is_trainer());


create policy "Learners manage own activity progress"
on public.learner_activity_progress
for all
to authenticated
using (learner_id = auth.uid() or public.is_trainer())
with check (learner_id = auth.uid() or public.is_trainer());


create policy "Learners manage own quiz attempts"
on public.quiz_attempts
for all
to authenticated
using (learner_id = auth.uid() or public.is_trainer())
with check (learner_id = auth.uid() or public.is_trainer());


create policy "Learners manage own quiz answers"
on public.quiz_answers
for all
to authenticated
using (
  public.is_trainer()
  or exists (
    select 1
    from public.quiz_attempts qa
    where qa.id = quiz_answers.attempt_id
      and qa.learner_id = auth.uid()
  )
)
with check (
  public.is_trainer()
  or exists (
    select 1
    from public.quiz_attempts qa
    where qa.id = quiz_answers.attempt_id
      and qa.learner_id = auth.uid()
  )
);


create policy "Learners read own checkpoint results"
on public.checkpoint_results
for select
to authenticated
using (learner_id = auth.uid() or public.is_trainer());

create policy "Trainers manage checkpoint results"
on public.checkpoint_results
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Learners read own certification results"
on public.certification_results
for select
to authenticated
using (learner_id = auth.uid() or public.is_trainer());

create policy "Trainers manage certification results"
on public.certification_results
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());


create policy "Learners read own certification component results"
on public.certification_component_results
for select
to authenticated
using (learner_id = auth.uid() or public.is_trainer());

create policy "Trainers manage certification component results"
on public.certification_component_results
for all
to authenticated
using (public.is_trainer())
with check (public.is_trainer());
