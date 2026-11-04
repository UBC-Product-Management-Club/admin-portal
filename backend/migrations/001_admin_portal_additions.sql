-- Admin portal additions to the shared PMC database.
-- Additive only: nothing existing is renamed, removed or backfilled.
-- Runs in one transaction, so any failure leaves the database unchanged.
--
-- New columns are nullable or have defaults, so existing inserts from the
-- public site keep working.

begin;

-- Event: card type and which tracks the attendee table shows.
create type public."EVENT_TYPE" as enum (
  'workshop',
  'speaker_panel',
  'case_competition',
  'social',
  'project_showcase'
);

alter table public."Event"
  add column type public."EVENT_TYPE",
  add column tracks text[] not null default '{}'
    constraint event_tracks_valid
    check (tracks <@ array['rsvp', 'payment', 'food', 'workshop']);

-- User: join date. Added before the default is set so existing members stay
-- null rather than all appearing to have joined today.
alter table public."User" add column created_at timestamptz;
alter table public."User" alter column created_at set default now();

-- Attendee: per-event check-in tracking.
alter table public."Attendee"
  add column checked_in boolean not null default false,
  add column food_claimed boolean not null default false,
  add column workshop_checked_in boolean not null default false;

create type public."REIMBURSEMENT_CATEGORY" as enum (
  'food',
  'venue',
  'marketing',
  'prizes',
  'software',
  'other'
);

create type public."REIMBURSEMENT_STATUS" as enum (
  'submitted',
  'approved',
  'paid',
  'rejected'
);

-- user_id and reviewed_by reference auth.users because execs log in through
-- Supabase, while public."User" ids come from Auth0 and Google.
create table public."Reimbursement" (
  reimbursement_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  event_id uuid references public."Event" (event_id) on delete set null,
  item text not null,
  amount numeric(10, 2) not null constraint reimbursement_amount_positive check (amount > 0),
  category public."REIMBURSEMENT_CATEGORY" not null,
  -- Path inside the private receipts bucket. The API returns signed URLs.
  receipt_path text not null,
  etransfer_email text not null,
  purchase_date date,
  notes text,
  status public."REIMBURSEMENT_STATUS" not null default 'submitted',
  reviewer_note text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reimbursement_no_self_review check (reviewed_by <> user_id)
);

create index reimbursement_user_id_status_idx
  on public."Reimbursement" (user_id, status);
create index reimbursement_status_idx on public."Reimbursement" (status);

-- One allocation per term and category. Spending is worked out by matching
-- reimbursements on the same category and term.
create table public."Budget_Line" (
  budget_line_id uuid primary key default gen_random_uuid(),
  term text not null constraint budget_line_term_format check (term ~ '^\d{4}-\d{2}$'),
  category public."REIMBURSEMENT_CATEGORY" not null,
  allocated numeric(10, 2) not null constraint budget_line_allocated_not_negative check (allocated >= 0),
  created_at timestamptz not null default now(),
  constraint budget_line_term_category_unique unique (term, category)
);

-- The anon key can reach the public schema, so these stay closed. With RLS on
-- and no policies, only the backend's service-role key can read or write them.
alter table public."Reimbursement" enable row level security;
alter table public."Budget_Line" enable row level security;

-- Receipts contain personal financial details, so the bucket is private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/*', 'application/pdf']
);

commit;
