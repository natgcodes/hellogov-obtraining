│
◇  Downloading snippet...
insert into public.modules (
  day_id,
  title,
  description,
  objective,
  duration_minutes,
  position,
  is_required
)
values
(
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'HelloGov & iVisa',
  'Why the partnership exists and how Customer Support fits in.',
  'Understand what HelloGov and iVisa do, why the partnership was created, and how Customer Service supports customers throughout the process.',
  30,
  1,
  true
),
(
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'Handbook Intro',
  'The Customer Support Employee Handbook and how to navigate it.',
  'Know the Customer Support Employee Handbook and where to look things up during the rest of training and on the floor.',
  null,
  2,
  true
),
(
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'Vocabulary',
  'Core passport and customer-support terminology used throughout onboarding.',
  'Recognize and correctly use the most common terms agents will encounter when assisting HelloGov customers.',
  null,
  3,
  true
),
(
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'Document Etiquette',
  'How customer documents should be reviewed, discussed and handled.',
  'Understand the expected standards when working with customer documentation.',
  null,
  4,
  true
),
(
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'Types of Passport & Requirements',
  'Passport service types and the requirements associated with each one.',
  'Identify the appropriate passport service and understand the documentation requirements for common customer scenarios.',
  null,
  5,
  true
),
(
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'Passport Processing',
  'How passport applications move through the process.',
  'Understand the main stages of passport processing and what happens at each stage.',
  null,
  6,
  true
),
(
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'Processing Times & Prices',
  'Expected processing timelines, completion dates and customer pricing.',
  'Understand processing times and prices and practice calculating expected completion dates for customer scenarios.',
  null,
  7,
  true
),
(
  'b32a22c3-d046-4e5f-a022-a688b335e2c5',
  'Training Charts',
  'How to locate and interpret frequently needed information in HelloGov Training Charts.',
  'Learn to understand and quickly read the Training Charts provided by HelloGov.',
  60,
  8,
  true
)
returning
  id,
  title,
  duration_minutes,
  position;
