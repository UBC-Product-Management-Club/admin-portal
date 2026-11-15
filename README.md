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

## Deploying

Same setup as `pmc-portal-be`: two GitHub Environments, each with its own Cloud Run services and Supabase project.

| Environment  | When                                   | Workflow              |
| ------------ | -------------------------------------- | --------------------- |
| `staging`    | Every push to `main`, once CI passes   | `deploy-staging.yaml` |
| `production` | By hand: Actions → Deploy (PROD) → Run | `deploy.yaml`         |

Both call `_deploy.yaml`. Values (Settings → Environments, or repo-wide where noted):

| Name                  | Kind     | Where           | Notes                                                       |
| --------------------- | -------- | --------------- | ----------------------------------------------------------- |
| `PROJECT_ID`          | secret   | repo            | Google Cloud project                                        |
| `GCLOUD_AUTH`         | secret   | repo            | Service account key JSON                                    |
| `ARTIFACT_REPOSITORY` | variable | repo            | Artifact Registry repository for images                     |
| `APP_NAME`            | secret   | per environment | Frontend service name; the API is `<APP_NAME>-api`          |
| `SUPABASE_URL`        | variable | per environment | That environment's Supabase project                         |
| `SUPABASE_ANON_KEY`   | variable | per environment |                                                             |
| `SERVICE_ROLE_SECRET` | variable | per environment | Secret Manager name holding that project's service role key |
| `CUSTOM_DOMAIN`       | variable | production only | e.g. `admin.ubcpmc.com`, added to the API's CORS origins    |

Don't also set `APP_NAME` or the Supabase values repo-wide: an environment that's missing one would silently fall back to the repo-wide (prod) value.
