# Admin Portal

Internal web tool PMC execs use to manage members, events and finances.

## Structure

- `frontend/` — React Router 8 SPA (see `frontend/README.md`)
- `backend/` — Express + TypeScript admin API (see `backend/README.md`)

## Architecture

```
[Browser / React SPA] ──> [PMC Backend API] ──> [Postgres (Supabase)]
        │                         └──> [Supabase Storage]
        └──> [Supabase Auth (login, JWT)]

Hosting: GitHub Actions ──> Cloud Build ──> Cloud Run (us-west1)
```
