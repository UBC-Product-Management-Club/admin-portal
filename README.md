# Admin Portal

Internal web tool PMC execs use to manage members, events and finances.

## Structure

- `frontend/` — React Router 7 SPA (see `frontend/README.md`)
- `backend/` — notes on the PMC backend API the portal talks to

## Architecture

```
[Browser / React SPA] ──> [PMC Backend API] ──> [Postgres (Supabase)]
        │                         └──> [Supabase Storage]
        └──> [Supabase Auth (login, JWT)]

Hosting: GitHub Actions ──> Cloud Build ──> Cloud Run (us-west1)
```
