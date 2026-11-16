-- Admin portal: reimbursement requests and their receipts.
-- Additive only: creates new types, a new table and a new bucket, and touches
-- nothing the public site uses. Runs in one transaction, so any failure leaves
-- the database unchanged.

begin;

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

-- The anon key can reach the public schema, so this stays closed. With RLS on
-- and no policies, only the backend's service-role key can read or write it.
alter table public."Reimbursement" enable row level security;

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
