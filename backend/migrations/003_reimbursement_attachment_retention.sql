-- Retain every uploaded receipt for audit purposes. A submitter can remove an
-- attachment from the active version of a request, but Finance can still trace
-- the original file rather than losing evidence from storage.

begin;

alter table public."ReimbursementAttachment"
  add column if not exists retired_at timestamptz,
  add column if not exists retired_by uuid references auth.users (id);

create index if not exists reimbursement_attachment_active_idx
  on public."ReimbursementAttachment" (reimbursement_id, sort_order, created_at)
  where retired_at is null;

commit;
