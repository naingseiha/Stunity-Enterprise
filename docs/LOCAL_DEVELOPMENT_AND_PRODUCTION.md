# Local Development & Production Parity

This document summarizes how local development aligns with production: Prisma, database safety, and frontend–backend behavior.

**Last updated:** March 2026

---

## Prisma: Same Schema & Client Everywhere

- **One schema:** `packages/database/prisma/schema.prisma` is the single source of truth for both local dev and production.
- **Same generated client:** The same models, enums, and types are used locally and in deployed services. No separate “dev” schema.
- **Local:** From the repo root, run `npm run db:generate` after clone (or after schema changes). This generates the Prisma client into the root `node_modules/.prisma/client` so all workspace apps and services use it.
- **Production (Docker):** Each service’s Dockerfile runs `prisma generate` during the image build using the same schema; the generated client is copied into that service’s `node_modules`. So production uses the same Prisma client as local, just built inside the container.

**Bottom line:** What you develop against locally (same Prisma schema and types) is what runs in production.

---

## Database Safety (Real Supabase in Local Dev)

You can use **one database** (e.g. production Supabase) for both production and local development. To avoid accidentally changing or wiping real data, destructive commands are guarded.

- **Blocked when `DATABASE_URL` points at Supabase (unless overridden):**
  - `npm run db:push`
  - `npm run db:migrate`
  - `npm run seed:all` and related seed scripts
  - `npx tsx scripts/reset-to-clean.ts`
- **Not blocked:** Starting the app and services, normal read/write through the API (login, CRUD, etc.).
- **Override (e.g. for CI/deploy):** Set `ALLOW_PRODUCTION_DB=1` when you intentionally run migrations or seed against production.

See **[DATABASE_SAFETY.md](./DATABASE_SAFETY.md)** for full details.

---

## Frontend–Backend: Local vs Production

- **Same code:** The Next.js app and all backend services are the same codebase locally and in production.
- **Same API contracts:** Routes, request/response shapes, and auth flow are identical. If the frontend works with the backend locally, it will work in production **provided** production is configured correctly.
- **Production configuration:**
  - Set all `NEXT_PUBLIC_*` API URLs to the **deployed** service URLs (e.g. Cloud Run), not `localhost`.
  - Configure CORS on each service to allow the production frontend origin.
  - Set production secrets (e.g. `JWT_SECRET`, `DATABASE_URL`) in the deployment environment.

So: the frontend that works with the backend locally will work in production when the right env vars and CORS are set.

---

## Recent Fixes & Conventions (March 2026)

- **Analytics service:** Auth middleware and `req.user` typing fixed; CORS closing brace corrected; Express `Request` augmented via `src/types/express.d.ts` so `req.user` has `id`, `email`, `role`.
- **Next.js `params`:** In App Router, `params` is a Promise. Pages under `[locale]` (e.g. students) use `React.use(params)` and accept `params: Promise<{ locale: string }>` (and similar for other dynamic segments) to avoid the “param property accessed directly” warning and stay compatible with future Next.js versions.
- **Web UI:** Login page redesigned (single centered card); dashboard and school management pages (students, classes, teachers, etc.) updated for consistent layout (e.g. `max-w-7xl`, `bg-slate-50`), breadcrumbs, and card styling (`rounded-xl`, `shadow-sm`).
- **Sidebar:** Main app sidebar width set to `w-64` to match content margin (`lg:ml-64`).

These are documented here so future developers know the intended patterns for params, auth typing, and UI consistency.
