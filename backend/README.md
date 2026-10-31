# Backend

The portal's data comes from the external PMC backend API (`/api/v2/admin` namespace), which lives in a separate private repo and owns the Supabase Postgres database. See the design spec for endpoints and the proposed `registrations`, `reimbursements` and `budget_lines` tables.

This folder is reserved for any portal-specific backend work.
