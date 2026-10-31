# Admin Portal — Frontend

React 19 + React Router 7 (SPA mode) + TypeScript, styled with Tailwind CSS v4 and shadcn/ui (Radix).

## Setup

```sh
cp .env.example .env   # fill in values
npm install
npm run dev
```

| Variable                   | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `VITE_API_URL`             | PMC backend base URL (calls go to `/api/v2/admin`) |
| `VITE_SUPABASE_URL`        | Supabase project URL                               |
| `VITE_SUPABASE_PUBLIC_KEY` | Supabase public (anon) key — never the service key |

## Scripts

| Script              | Does                                 |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server                           |
| `npm run build`     | Static SPA build into `build/client` |
| `npm run typecheck` | Route typegen + `tsc`                |
| `npm run lint`      | ESLint 9                             |
| `npm run format`    | Prettier                             |
| `npm test`          | Vitest + Testing Library (jsdom)     |

## Layout

```
app/
  routes.ts              route config (login + guarded layout)
  routes/                one file per page
  components/ui/         shadcn components (`npx shadcn@latest add <name>`)
  hooks/
  lib/
    env.ts               Zod-validated VITE_* env
    supabase.ts          Supabase Auth client
    api/rest-client.ts   RestClient singleton: bearer token + Zod parsing
    api/base-service.ts  base class for feature services
    types/               Zod schemas (the one place to update on API changes)
```

The route guard is client-side only; the backend enforces admin auth on every endpoint.

## Deploy

`Dockerfile` builds the SPA (pass `VITE_*` as build args) and serves it with nginx on port 8080 for Cloud Run.
