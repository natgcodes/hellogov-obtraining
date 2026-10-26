│
◇  Downloading snippet...
alter table public.profiles
add column team_lead_id uuid null;

alter table public.profiles
add constraint profiles_team_lead_id_fkey
foreign key (team_lead_id)
references public.profiles(id)
on delete set null;

create index profiles_team_lead_id_idx
on public.profiles(team_lead_id);
