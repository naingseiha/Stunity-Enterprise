# Stunity Creator-Tools — Handoff

> Status as of **2026-06-25**. Use this to continue the work in a fresh session.

## Kickoff prompt (paste into a new conversation)

```
បន្តការងារ "Stunity creator-Tools initiative" (មើល memory: project_lesson_planner.md
និង docs/TOOLS_HANDOFF.md)។

ស្ថានភាពបច្ចុប្បន្ន — ទាំងអស់ MERGED ចូល main (#12) + DEPLOYED to prod:
- apps/web (Next.js): tool-first landing redesign, public Tools hub (/[locale]/tools),
  Lesson Planner (/tools/lesson-planner) + Exam Builder (/tools/exam) — MoEYS, ខ្មែរ
- Anonymous localStorage drafts + signup gate; cloud-sync ពេល login
- Backend: learn-service /tool-drafts API + ToolDraft model — LIVE លើ Cloud Run (verified)
- 19 jest tests (web 13 + learn-service 6); tsc + build green

ការងារនៅសល់ (តាមអាទិភាព): មើល section "Next steps" ក្នុង docs/TOOLS_HANDOFF.md។
ចាប់ផ្តើមដោយសួរថា web deploy/verify រួចឬនៅ រួចណែនាំ step បន្ទាប់។
```

---

## What shipped

One Stunity user, three surfaces: **Social feed · School management (when linked) ·
personal AI creator Tools**. Tools work **without an account** (local-first), then
**sync to the account** once signed in.

| Area | Path | Notes |
|------|------|-------|
| Landing | `apps/web/src/app/[locale]/page.tsx` | Bilingual (KH/EN) tool-first SaaS home; inline `T{}` copy dict (not next-intl yet) |
| Tools hub | `apps/web/src/app/[locale]/tools/page.tsx` | Public; lists tools + "Your work" (merged local+cloud drafts) |
| Lesson Planner | `apps/web/src/app/[locale]/tools/lesson-planner/{page,data}.tsx` | Hub→Create→Generating→editable MoEYS A4 doc |
| Exam Builder | `apps/web/src/app/[locale]/tools/exam/{page,data}.ts(x)` | Hub→Config→Generating→MoEYS exam; Mix-mode, 100-pt split, question bank |
| Drafts lib | `apps/web/src/app/[locale]/tools/lib/drafts.ts` | localStorage CRUD + cloud sync (cloudList/Upsert/Delete, mergeDrafts, loadDrafts) |
| Backend API | `services/learn-service/src/controllers/tool-drafts.controller.ts` + `routes/tool-drafts.routes.ts` | `GET/PUT :id/DELETE :id`, auth + ownership guard |
| DB | `packages/database/prisma/schema.prisma` (`ToolDraft`) + migration `20260625000000_add_tool_drafts` | userId-scoped, no FK, additive |
| Tests | `**/tools/exam/data.test.ts`, `**/tools/lib/drafts.test.ts`, `learn-service/.../tool-drafts.controller.test.ts` | 19 total; jest configs added to web + learn-service |

**Deployed:** learn-service on Cloud Run (project `stunity-enterprise`, rev 00008).
Verified live: `/health` 200, `/tool-drafts` 401 (route + auth). Web env
`NEXT_PUBLIC_LEARN_SERVICE_URL` points to the same service.

## Next steps (priority order)

1. **Verify web (Vercel) deploy of `main`** + browser smoke: login → save →
   toast "បាន sync ទៅគណnី" → other browser/device → draft appears in "ការងាររបស់អ្នក".
   Confirm Vercel env `NEXT_PUBLIC_LEARN_SERVICE_URL` = the Cloud Run URL.
2. **Merge `chore/repo-hygiene`** PR if still open (gitignore build caches + mobile Sentry).
3. **Slides generator** (`/tools/slides`, + present mode) — mirror the Exam/Lesson Planner
   pattern. Design source: `~/Downloads/Lesson Planner.html` (dc-runtime bundle; decode
   `__bundler/template` = JSON-string `<x-dc>` markup + `DCLogic` class; slide markup
   ~lines 1990–2310, `renderVals` slide data ~3842+).
4. **Tech debt:** migrate landing/tools inline `T{}` dicts → next-intl `km/en.json`;
   add a "Tools" entry to `UnifiedNavigation` for signed-in users.

## Gotchas

- **New `*.test.ts` under a service `src/` must be excluded from that service's prod
  `tsc` build** (`tsconfig.json` `exclude`), or the Cloud Run Docker build fails
  (`@types/jest` not installed → TS2582/TS2304). Already handled for learn-service +
  apps/web; repeat for any new service tests.
- Cloud-sync calls are **best-effort** — failures degrade silently to local-only, so the
  app never breaks if the service is down or a deploy lags.
- Two Cloud Run URLs (`*-936508661701.us-central1.run.app` and `*-mc7wnjp2kq-uc.a.run.app`)
  route to the **same** service.

## Deploy commands (per env)

```bash
# DB migration (additive, idempotent)
cd packages/database
npx prisma db execute --file prisma/migrations/20260625000000_add_tool_drafts/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260625000000_add_tool_drafts --schema prisma/schema.prisma
npx prisma generate

# Backend (needs DATABASE_URL + JWT_SECRET in shell)
./scripts/deploy-cloud-run.sh learn-service
```
