-- Admin portal additions to existing tables, plus the budget table.
-- Not run yet: nothing in the portal reads these columns, so they wait until a
-- feature needs them. Requires 001 (Budget_Line uses its category type).
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

-- The anon key can reach the public schema, so this stays closed.
alter table public."Budget_Line" enable row level security;

commit;
