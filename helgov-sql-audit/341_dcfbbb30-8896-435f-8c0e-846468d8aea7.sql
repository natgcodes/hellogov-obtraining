│
◇  Downloading snippet...
insert into public.days (
  program_id,
  day_number,
  title,
  description,
  position,
  is_published
)
values
(
  '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0',
  2,
  'Platform & Customer Operations',
  'Customer Journey, HelloGov tools, Sydney, call flow, order status, notes and email etiquette.',
  2,
  false
),
(
  '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0',
  3,
  'Customer Support Processes',
  'Operational processes, customer education, tracking, escalation and related workflows.',
  3,
  false
),
(
  '5f5a6ef1-3133-45f6-b421-0dc09ea4a6a0',
  4,
  'Exceptions & Advanced Support',
  'Non-refundable cases, order cancellation and advanced customer scenarios.',
  4,
  false
)
on conflict (program_id, day_number)
do update set
  title = excluded.title,
  description = excluded.description,
  position = excluded.position;
