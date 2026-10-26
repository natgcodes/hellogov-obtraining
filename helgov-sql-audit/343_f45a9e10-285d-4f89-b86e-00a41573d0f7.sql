│
◇  Downloading snippet...
insert into public.activities (
  module_id,
  title,
  description,
  instructions,
  activity_type,
  duration_minutes,
  is_required,
  position
)
values
(
  'c1e2cad7-3a1a-4772-ba71-9a6e00c6a6c5',
  'Explain HelloGov to a Customer',
  'Practice explaining what HelloGov does and how it supports customers.',
  'Using what you learned about HelloGov and iVisa, write a short customer-friendly explanation of what HelloGov does and how the service supports the passport process.',
  'written',
  null,
  true,
  1
),
(
  'd6281de5-2c08-4f6e-8d98-80054ea86a96',
  'Find It in the Handbook',
  'Practice locating information in the Customer Support Employee Handbook.',
  'Use the handbook to locate the information requested by your trainer and identify where you would find it again when assisting customers.',
  'practice',
  null,
  false,
  1
)
returning
  id,
  module_id,
  title,
  activity_type,
  duration_minutes,
  is_required,
  position;
