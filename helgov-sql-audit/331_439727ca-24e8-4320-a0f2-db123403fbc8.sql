│
◇  Downloading snippet...
-- =========================================================
-- 22 — Inspect Program Publication State
-- =========================================================

select
  p.id as program_id,
  p.title as program_title,
  p.status as program_status,
  d.id as day_id,
  d.day_number,
  d.title as day_title,
  d.is_published as day_published
from public.programs p
left join public.days d
  on d.program_id = p.id
order by p.created_at, d.day_number;
