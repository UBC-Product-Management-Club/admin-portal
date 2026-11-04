# Admin Portal — Backend

Express 5 + TypeScript API serving the portal under `/api/v2/admin`. Auth is a Supabase JWT (`Authorization: Bearer <token>`), and only users with a PMC email domain are allowed through. Errors use `{ "error": { "code", "message" } }`.

## Setup

Requires Node 22.22+ (Node 24 recommended).

```sh
cp .env.example .env   # fill in values
npm install
npm run dev            # http://localhost:8000
```

| Variable                    | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `PORT`                      | Port to listen on (Cloud Run sets this)                     |
| `ORIGIN`                    | Local portal origin allowed by CORS                         |
| `ADMIN_PORTAL_ORIGIN`       | Deployed portal origin allowed by CORS                      |
| `SUPABASE_URL`              | Supabase project URL                                        |
| `SUPABASE_ANON_KEY`         | Used to verify user JWTs                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Database/storage access — server-side only, never commit    |
| `SUPABASE_*_BUCKET_NAME`    | Storage buckets (event media, deliverables, attendee files) |
| `ADMIN_EMAIL_DOMAINS`       | Email domains allowed to use the admin API                  |

## Layout

```
src/
  server.ts                 entry point (loads env, starts the server)
  app.ts                    createApp(): middleware + /api/v2/admin router
  env.ts                    Zod-validated env
  lib/supabase.ts           token verifier + service-role client
  lib/http-error.ts         HttpError → standard error JSON
  middleware/               requireAdmin, notFound, errorHandler
  lib/applicants.ts         applicant review, decisions go through accept_applicants / reject_applicants
  routes/                   users, events, reimbursements, budget (stubs → 501, except applicants)
```

## Scripts

`dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test` (Vitest + Supertest).
