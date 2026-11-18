-- Add the current PMC reimbursement departments to environments that already
-- ran the original reimbursement foundation migration.

begin;

insert into public."ReimbursementDepartment" (slug, label, sort_order, is_active, archived_at)
values
  ('community', 'Community', 20, true, null),
  ('exec_dev', 'Exec-dev', 80, true, null)
on conflict (slug) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true,
  archived_at = null,
  updated_at = now();

commit;
