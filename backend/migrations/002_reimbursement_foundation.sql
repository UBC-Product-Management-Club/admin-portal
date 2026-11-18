-- Reimbursement phase 0: durable configuration, attachment/audit records,
-- and asynchronous integration jobs. This migration is additive so it is safe
-- to run after 001_admin_portal_additions.sql in an environment with data.

begin;

create table public."ReimbursementCategory" (
  reimbursement_category_id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  gl_code text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reimbursement_category_slug_format check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  constraint reimbursement_category_archive_consistent
    check ((is_active and archived_at is null) or (not is_active))
);

create table public."ReimbursementDepartment" (
  reimbursement_department_id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reimbursement_department_slug_format check (slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  constraint reimbursement_department_archive_consistent
    check ((is_active and archived_at is null) or (not is_active))
);

-- The Finance team owns this content. Versioning lets each ticket record the
-- instructions that were current when it was submitted.
create table public."ReimbursementInstruction" (
  reimbursement_instruction_id boolean primary key default true
    constraint reimbursement_instruction_singleton check (reimbursement_instruction_id),
  content text not null,
  version integer not null default 1 constraint reimbursement_instruction_version_positive check (version > 0),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

insert into public."ReimbursementCategory" (slug, label, gl_code, sort_order)
values
  ('award_and_prize', 'Award and prize', '70550', 10),
  ('misc_expense', 'Misc expense', '70107', 20),
  ('booking_and_rental', 'Booking and rental', '70200', 30),
  ('computer_hardware_software_website_maintenance', 'Computer hardware/software & website maintenance', '70333', 40),
  ('souvenir_and_gifts', 'Souvenir and gifts', '70544', 50),
  ('food_and_beverage', 'Food and beverage', '70080', 60)
on conflict (slug) do nothing;

insert into public."ReimbursementDepartment" (slug, label, sort_order)
values
  ('events', 'Events', 10),
  ('community', 'Community', 20),
  ('tech', 'Tech', 30),
  ('media', 'Media', 40),
  ('design', 'Design', 50),
  ('partnerships', 'Partnerships', 60),
  ('finance', 'Finance', 70),
  ('exec_dev', 'Exec-dev', 80)
on conflict (slug) do nothing;

insert into public."ReimbursementInstruction" (reimbursement_instruction_id, content)
values (
  true,
  'Attach clear receipts that show the vendor, date, purchased items, and total paid. Submit one request per expense category. Finance will verify the receipt total before reimbursement.'
)
on conflict (reimbursement_instruction_id) do nothing;

-- 001 created a single required receipt path and static category enum. Retain
-- those legacy columns for compatibility while later API phases use the new
-- category, department, attachment, and workflow fields below.
alter table public."Reimbursement"
  alter column receipt_path drop not null,
  add column if not exists reimbursement_category_id uuid references public."ReimbursementCategory" (reimbursement_category_id),
  add column if not exists reimbursement_department_id uuid references public."ReimbursementDepartment" (reimbursement_department_id),
  add column if not exists etransfer_full_name text,
  add column if not exists vendor text,
  add column if not exists vendor_reference text,
  add column if not exists workflow_status text not null default 'pending'
    constraint reimbursement_workflow_status_valid
      check (workflow_status in ('pending', 'in_transit', 'complete', 'needs_changes', 'rejected')),
  add column if not exists workflow_reason text,
  add column if not exists instruction_version integer,
  add column if not exists updated_at timestamptz not null default now();

create index reimbursement_department_status_idx
  on public."Reimbursement" (reimbursement_department_id, workflow_status);
create index reimbursement_category_status_idx
  on public."Reimbursement" (reimbursement_category_id, workflow_status);

create table public."ReimbursementAttachment" (
  reimbursement_attachment_id uuid primary key default gen_random_uuid(),
  reimbursement_id uuid not null references public."Reimbursement" (reimbursement_id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null constraint reimbursement_attachment_byte_size_positive check (byte_size > 0),
  sort_order integer not null default 0,
  superseded_by uuid references public."ReimbursementAttachment" (reimbursement_attachment_id),
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint reimbursement_attachment_supported_type
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'))
);
create index reimbursement_attachment_reimbursement_idx
  on public."ReimbursementAttachment" (reimbursement_id, sort_order, created_at);

create table public."ReimbursementStatusEvent" (
  reimbursement_status_event_id uuid primary key default gen_random_uuid(),
  reimbursement_id uuid not null references public."Reimbursement" (reimbursement_id) on delete restrict,
  from_status text check (from_status in ('pending', 'in_transit', 'complete', 'needs_changes', 'rejected')),
  to_status text not null check (to_status in ('pending', 'in_transit', 'complete', 'needs_changes', 'rejected')),
  reason text,
  source text not null default 'finance_manual'
    check (source in ('submitter', 'finance_manual', 'ams_email', 'system')),
  actor_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  constraint reimbursement_status_event_reason_required
    check (to_status not in ('needs_changes', 'rejected') or length(trim(coalesce(reason, ''))) > 0)
);
create index reimbursement_status_event_reimbursement_idx
  on public."ReimbursementStatusEvent" (reimbursement_id, created_at);

-- Jobs are claimed by a future worker. Keeping the outbox in the same database
-- transaction as request changes prevents Drive synchronization from being lost.
create table public."ReimbursementOutbox" (
  reimbursement_outbox_id uuid primary key default gen_random_uuid(),
  reimbursement_id uuid not null references public."Reimbursement" (reimbursement_id) on delete restrict,
  kind text not null check (kind = 'google_drive_sync'),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
  attempts integer not null default 0 constraint reimbursement_outbox_attempts_nonnegative check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index reimbursement_outbox_pending_idx
  on public."ReimbursementOutbox" (status, available_at)
  where status in ('pending', 'failed');

-- A dedicated, private bucket keeps reimbursement files separate from older
-- single-receipt uploads. Access is through signed URLs generated by the API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reimbursement-receipts',
  'reimbursement-receipts',
  false,
  26214400,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

alter table public."ReimbursementCategory" enable row level security;
alter table public."ReimbursementDepartment" enable row level security;
alter table public."ReimbursementInstruction" enable row level security;
alter table public."ReimbursementAttachment" enable row level security;
alter table public."ReimbursementStatusEvent" enable row level security;
alter table public."ReimbursementOutbox" enable row level security;

commit;
