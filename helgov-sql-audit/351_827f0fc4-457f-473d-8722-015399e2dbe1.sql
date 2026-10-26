│
◇  Downloading snippet...
-- =========================================================
-- HELLOGOV ONBOARDING
-- Auth Profile Automation
-- =========================================================


-- =========================================================
-- 1. CREATE PROFILE FOR NEW AUTH USERS
-- Every new Supabase Auth user automatically receives
-- a corresponding public.profiles record.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    'learner'
  );

  return new;
end;
$$;


-- =========================================================
-- 2. AUTH TRIGGER
-- Runs automatically whenever a user is created
-- =========================================================

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =========================================================
-- 3. UPDATED_AT HELPER
-- Reusable helper for tables with updated_at
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =========================================================
-- 4. UPDATED_AT TRIGGERS
-- =========================================================

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger programs_set_updated_at
before update on public.programs
for each row execute procedure public.set_updated_at();

create trigger setup_items_set_updated_at
before update on public.setup_items
for each row execute procedure public.set_updated_at();

create trigger days_set_updated_at
before update on public.days
for each row execute procedure public.set_updated_at();

create trigger modules_set_updated_at
before update on public.modules
for each row execute procedure public.set_updated_at();

create trigger materials_set_updated_at
before update on public.materials
for each row execute procedure public.set_updated_at();

create trigger activities_set_updated_at
before update on public.activities
for each row execute procedure public.set_updated_at();

create trigger quizzes_set_updated_at
before update on public.quizzes
for each row execute procedure public.set_updated_at();

create trigger quiz_questions_set_updated_at
before update on public.quiz_questions
for each row execute procedure public.set_updated_at();

create trigger checkpoints_set_updated_at
before update on public.checkpoints
for each row execute procedure public.set_updated_at();

create trigger certifications_set_updated_at
before update on public.certifications
for each row execute procedure public.set_updated_at();

create trigger certification_components_set_updated_at
before update on public.certification_components
for each row execute procedure public.set_updated_at();

create trigger post_training_set_updated_at
before update on public.post_training
for each row execute procedure public.set_updated_at();

create trigger post_training_stages_set_updated_at
before update on public.post_training_stages
for each row execute procedure public.set_updated_at();

create trigger learner_module_progress_set_updated_at
before update on public.learner_module_progress
for each row execute procedure public.set_updated_at();

create trigger learner_activity_progress_set_updated_at
before update on public.learner_activity_progress
for each row execute procedure public.set_updated_at();

create trigger certification_results_set_updated_at
before update on public.certification_results
for each row execute procedure public.set_updated_at();
