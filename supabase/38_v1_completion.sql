-- Query 38 — V1 Completion: learner checkpoints + certification review engine
-- Safe additive migration for the existing HelloGov schema.

alter table public.checkpoint_results add column if not exists status text not null default 'submitted';
alter table public.checkpoint_results add column if not exists score numeric;
alter table public.checkpoint_results add column if not exists passed boolean;
alter table public.checkpoint_results add column if not exists trainer_feedback text;
alter table public.checkpoint_results add column if not exists submitted_at timestamptz;
alter table public.checkpoint_results add column if not exists graded_at timestamptz;
alter table public.checkpoint_results add column if not exists graded_by uuid references auth.users(id);

alter table public.certification_component_results add column if not exists status text not null default 'submitted';
alter table public.certification_component_results add column if not exists score numeric;
alter table public.certification_component_results add column if not exists passed boolean;
alter table public.certification_component_results add column if not exists trainer_feedback text;
alter table public.certification_component_results add column if not exists submitted_at timestamptz;
alter table public.certification_component_results add column if not exists graded_at timestamptz;
alter table public.certification_component_results add column if not exists graded_by uuid references auth.users(id);

alter table public.certification_results add column if not exists status text not null default 'not_started';
alter table public.certification_results add column if not exists score numeric;
alter table public.certification_results add column if not exists passed boolean;
alter table public.certification_results add column if not exists completed_at timestamptz;

create unique index if not exists checkpoint_results_learner_checkpoint_uidx
on public.checkpoint_results(learner_id, checkpoint_id);
create unique index if not exists certification_component_results_learner_component_uidx
on public.certification_component_results(learner_id, component_id);
create unique index if not exists certification_results_learner_certification_uidx
on public.certification_results(learner_id, certification_id);

create or replace function public.submit_checkpoint(target_checkpoint_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.checkpoints c join public.days d on d.id=c.day_id join public.programs p on p.id=d.program_id where c.id=target_checkpoint_id and d.is_published=true and p.status='published') then raise exception 'Checkpoint is not available'; end if;
  insert into public.checkpoint_results(learner_id,checkpoint_id,status,submitted_at)
  values(auth.uid(),target_checkpoint_id,'submitted',now())
  on conflict(learner_id,checkpoint_id) do update set status='submitted',submitted_at=now(),score=null,passed=null,trainer_feedback=null,graded_at=null,graded_by=null;
end;$$;

create or replace function public.grade_checkpoint_result(target_result_id uuid, awarded_score numeric, feedback text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare threshold numeric;
begin
 if not public.is_trainer() then raise exception 'Trainer access required'; end if;
 if awarded_score < 0 or awarded_score > 100 then raise exception 'Score must be between 0 and 100'; end if;
 select coalesce(c.passing_score,0) into threshold from public.checkpoint_results r join public.checkpoints c on c.id=r.checkpoint_id where r.id=target_result_id;
 if not found then raise exception 'Checkpoint result not found'; end if;
 update public.checkpoint_results set score=awarded_score,passed=awarded_score>=threshold,status='graded',trainer_feedback=nullif(trim(feedback),''),graded_at=now(),graded_by=auth.uid() where id=target_result_id;
end;$$;

create or replace function public.submit_certification_component(target_component_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare cert_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select c.certification_id into cert_id from public.certification_components c join public.certifications cert on cert.id=c.certification_id join public.programs p on p.id=cert.program_id where c.id=target_component_id and p.status='published';
 if cert_id is null then raise exception 'Certification component is not available'; end if;
 insert into public.certification_component_results(learner_id,component_id,status,submitted_at)
 values(auth.uid(),target_component_id,'submitted',now())
 on conflict(learner_id,component_id) do update set status='submitted',submitted_at=now(),score=null,passed=null,trainer_feedback=null,graded_at=null,graded_by=null;
 insert into public.certification_results(learner_id,certification_id,status)
 values(auth.uid(),cert_id,'in_progress') on conflict(learner_id,certification_id) do update set status=case when public.certification_results.status='completed' then public.certification_results.status else 'in_progress' end;
end;$$;

create or replace function public.grade_certification_component_result(target_result_id uuid, awarded_score numeric, feedback text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare threshold numeric; v_learner uuid; v_cert uuid; v_total int; v_graded int; v_avg numeric; v_overall numeric;
begin
 if not public.is_trainer() then raise exception 'Trainer access required'; end if;
 if awarded_score < 0 or awarded_score > 100 then raise exception 'Score must be between 0 and 100'; end if;
 select coalesce(c.passing_score,0),r.learner_id,c.certification_id into threshold,v_learner,v_cert from public.certification_component_results r join public.certification_components c on c.id=r.component_id where r.id=target_result_id;
 if not found then raise exception 'Certification result not found'; end if;
 update public.certification_component_results set score=awarded_score,passed=awarded_score>=threshold,status='graded',trainer_feedback=nullif(trim(feedback),''),graded_at=now(),graded_by=auth.uid() where id=target_result_id;
 select count(*) into v_total from public.certification_components where certification_id=v_cert;
 select count(*),coalesce(avg(r.score),0) into v_graded,v_avg from public.certification_component_results r join public.certification_components c on c.id=r.component_id where r.learner_id=v_learner and c.certification_id=v_cert and r.status='graded';
 select coalesce(passing_score,0) into v_overall from public.certifications where id=v_cert;
 insert into public.certification_results(learner_id,certification_id,status,score,passed,completed_at)
 values(v_learner,v_cert,case when v_graded=v_total and v_total>0 then 'completed' else 'in_progress' end,case when v_graded=v_total and v_total>0 then v_avg else null end,case when v_graded=v_total and v_total>0 then v_avg>=v_overall else null end,case when v_graded=v_total and v_total>0 then now() else null end)
 on conflict(learner_id,certification_id) do update set status=excluded.status,score=excluded.score,passed=excluded.passed,completed_at=excluded.completed_at;
end;$$;

grant execute on function public.submit_checkpoint(uuid) to authenticated;
grant execute on function public.grade_checkpoint_result(uuid,numeric,text) to authenticated;
grant execute on function public.submit_certification_component(uuid) to authenticated;
grant execute on function public.grade_certification_component_result(uuid,numeric,text) to authenticated;

-- RLS remains enabled. These policies allow learners to read only their own results;
-- trainer reads are allowed through is_trainer(). Writes happen through the SECURITY DEFINER RPCs above.
alter table public.checkpoint_results enable row level security;
alter table public.certification_component_results enable row level security;
alter table public.certification_results enable row level security;

drop policy if exists "checkpoint results read own or trainer" on public.checkpoint_results;
create policy "checkpoint results read own or trainer" on public.checkpoint_results for select to authenticated using (learner_id=auth.uid() or public.is_trainer());
drop policy if exists "cert component results read own or trainer" on public.certification_component_results;
create policy "cert component results read own or trainer" on public.certification_component_results for select to authenticated using (learner_id=auth.uid() or public.is_trainer());
drop policy if exists "cert results read own or trainer" on public.certification_results;
create policy "cert results read own or trainer" on public.certification_results for select to authenticated using (learner_id=auth.uid() or public.is_trainer());
