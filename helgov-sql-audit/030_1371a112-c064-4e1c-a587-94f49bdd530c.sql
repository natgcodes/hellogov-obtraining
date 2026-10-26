│
◇  Downloading snippet...
-- Query 318 — Add Account Deactivation Fields

ALTER TABLE public.profiles

ADD COLUMN IF NOT EXISTS account_status text
    NOT NULL DEFAULT 'active',

ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,

ADD COLUMN IF NOT EXISTS deactivation_reason text,

ADD COLUMN IF NOT EXISTS deactivated_by uuid
    REFERENCES public.profiles(id);

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_account_status_check
CHECK (account_status IN ('active', 'deactivated'));
