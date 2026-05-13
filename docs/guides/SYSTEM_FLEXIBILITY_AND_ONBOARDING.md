# Stunity Enterprise: Localization, Flexibility, & Onboarding Strategy

> **Last Updated:** April 14, 2026
> **Status:** Architecture approved — safe rollout in progress (Education Model feature)

## 1. Project Objective
The goal is to design the Stunity Enterprise School Management System to be heavily optimized and defaulted for the **Cambodian (Khmer) Education System**, while keeping the underlying architecture flexible enough to seamlessly expand internationally in the future.

Everything from school registration to the visual UI and backend data structures should feel native to Cambodia first, but easily configurable for other countries later.

---

## 2. The Core Solution: "Education Models"
To prevent hardcoding "Khmer-only" logic deep in the backend services, we introduce an **Education Model / System Profile** at the `School` (tenant) level.

### Prisma Enum: `EducationModel`
```prisma
enum EducationModel {
  KHM_MOEYS   // Cambodia — Ministry of Education, Youth and Sport (default)
  EU_STANDARD // Generic European/term-based system
  INT_BACC    // International Baccalaureate
  CUSTOM      // School-defined — no auto-seeding
}
```

### Fields on the `School` model
| Field | Type | Default | Purpose |
|---|---|---|---|
| `countryCode` | `String?` | `"KH"` | ISO 3166-1 alpha-2 country code — **already exists** |
| `defaultLanguage` | `String?` | `"km-KH"` | BCP-47 locale tag |
| `educationModel` | `EducationModel?` | `KHM_MOEYS` | Drives seeding dispatch at registration |
| `regionCode` | `String?` | `null` | Sub-national region — **already exists** |

By tying seeding logic to `educationModel`, developers know exactly where region-specific rules apply.

> **Note for existing schools:** `Svaythom High School` will be backfilled to `KHM_MOEYS` automatically by the migration — no manual step required.

---

## 3. The Registration & Onboarding Flow
The "First Onboarding" is the most critical part of this flexibility. When a new school administrator registers, they explicitly select their education model.

### Step 1: The Registration Form
- The admin picks their **Education System** from a dropdown (Cambodia MoEYS listed first with a "Recommended" badge).
- The system captures `educationModel` and sets `countryCode` / `defaultLanguage` defaults based on the selection.
- For the current rollout, `countryCode` uses safe model defaults (`KH`, `GB`, `US`) unless a later UI adds an explicit country override.
- The admin still makes the final choice on the education model itself — that selection is the source of truth.

### Step 2: Smart Initialization (The "Magic" Step)
On school creation, the backend seeding dispatch function (`getEducationModelDefaults`) chooses the right defaults:

| Education Model | Academic Terms | Subjects Seeded | Public Holidays |
|---|---|---|---|
| `KHM_MOEYS` | Semester 1 + 2 (Sep–Aug) | 15 MoEYS subjects per grade level | 13 Cambodian public holidays |
| `EU_STANDARD` | Autumn Term + Spring Term | 6 generic starter subjects are suggested in onboarding, but kept manual during the current safe rollout | None — admin adds locally |
| `INT_BACC` | Term 1 + Term 2 + Term 3 | 6 generic IB-style starter subjects are suggested in onboarding, but kept manual during the current safe rollout | None — admin adds locally |
| `CUSTOM` | Term 1 + Term 2 | Empty — admin creates their own | None |

---

## 3A. Current Rollout Guardrail: Subject Data Must Stay Safe

This is the most important implementation note for the next engineer:

> [!IMPORTANT]
> `Subject` is still a **global shared table** in the current schema. It is **not** yet scoped by `schoolId`.

That means writing non-Khmer starter subjects directly into `subjects` would leak one school's curriculum into another school's live production data.

### Safe rollout decision
- `KHM_MOEYS` keeps the current canonical subject seeding because the existing platform already assumes those global subjects.
- `EU_STANDARD` and `INT_BACC` may show **starter subject suggestions in onboarding**, but those subject rows must stay manual until the schema is tenant-safe.
- `CUSTOM` remains fully manual.

### Before full non-KHM subject auto-seeding
1. Add tenant scoping to `Subject` (or equivalent school-specific curriculum ownership).
2. Update `subject-service`, teacher assignment paths, grade paths, and timetable paths to respect that scoping.
3. Add QA coverage proving one school's subject setup cannot change another school's live data.

Without that guardrail, the feature would be unsafe for Supabase production data.

---

## 3B. Enterprise Registration Control Mode (Implemented)

To balance growth and safety, registration now follows a **pending-but-onboardable** model by default:

- New schools are created with `registrationStatus = PENDING`.
- New schools are set `isActive = true` by default so admins can log in and complete onboarding immediately.
- High-risk operations (claim-code distribution, bulk invite flows) are blocked until Super Admin marks the school `APPROVED`.

This keeps first-time setup smooth for real schools while preserving risk controls for production.

### Environment controls

| Variable | Default | Behavior |
|---|---|---|
| `PENDING_SCHOOL_ACCESS_MODE` | `active` | `active` = pending schools can log in and onboard; `inactive` = pending schools cannot log in until approval |
| `AUTO_APPROVE_SCHOOL_REGISTRATION` | `false` | If `true`, new schools are created as `APPROVED` immediately (use sparingly) |

---

## 4. Module-Level Flexibility (Khmer System Focus)

If we optimize for the Khmer system first, here is how the core modules should adapt:

### A. Student & Parent Modules
- **Name Formatting:** The system must respect the Khmer naming convention (Last Name followed by First Name) in the UI, even though underlying databases store them separately. (The recent English name implementation complements this perfectly for bilingual ID cards.)
- **ID Generation:** Provide an option to auto-generate Student IDs matching local standardized testing formats.

### B. Teacher Module
- **Dual Roles:** In Cambodia, teachers often teach specific subjects but also act as homeroom teachers for a specific grade. The schema supports a teacher having a `Subject Teacher` role across multiple classes and a `Homeroom` role for one specific class — already implemented.

### C. Class & Subject Modules
- **Pre-populated Curriculum:** When a school with `KHM_MOEYS` profile is created, the system pre-fills standard MoEYS subjects (Khmer Literature, Mathematics, Physics, Chemistry, Morality/Civics, etc.).
- **Timetabling (Shift-based):** Cambodian schools frequently operate on half-day shifts (Morning Shift / Afternoon Shift). The `SchoolShift` model supports this — already implemented.

---

## 5. Implementation Roadmap
1. **Schema Update:** Add `EducationModel` enum + `educationModel`, `defaultLanguage` fields to `School` in `packages/database`.
2. **Migration:** Create a migration SQL file that adds nullable columns and backfills existing schools.
3. **Seeding Dispatch:** Refactor `default-templates.ts` to export `getEducationModelDefaults()` so seeding is driven by the enum, not hardcoded.
4. **Backend:** Update the `registerSchoolSchema` validator and `POST /schools/register` endpoint.
5. **Registration UI:** Add the Education System dropdown to `register-school/page.tsx`.
6. **Onboarding Steps:** Make `WelcomeStep.tsx`, `CalendarStep.tsx`, and `SubjectsStep.tsx` model-aware.
7. **Phase 2 safety prerequisite:** Tenant-scope `Subject` before enabling automatic non-KHM subject persistence.

---

## 6. Schema Migration Safety Plan

> [!CAUTION]
> All schema changes use **nullable columns with safe defaults**. No existing row is broken. The Svaythom High School production data is fully protected.

### Migration approach
- Column additions use `ALTER TABLE ... ADD COLUMN` with `DEFAULT` values — PostgreSQL applies them without locking or data loss.
- The `EducationModel` enum is a new type — adding it does not affect existing data.
- A safe `UPDATE` backfill runs inside the migration to set `KHM_MOEYS` on all existing `KH` schools.

### Running migrations
```bash
# Development (local, against a non-Supabase DB)
npm run db:migrate

# Production / CI (against Supabase — requires explicit opt-in)
ALLOW_PRODUCTION_DB=1 npx prisma migrate deploy
```

> [!WARNING]
> `db:migrate` and `db:push` are **blocked** when `DATABASE_URL` points at Supabase (see `docs/DATABASE_SAFETY.md`). Only set `ALLOW_PRODUCTION_DB=1` in CI/CD pipelines, never in everyday local dev.

### Production data protection checklist
- [x] New columns are nullable or have non-breaking `DEFAULT` values
- [x] No existing columns are renamed or dropped
- [x] Backfill `UPDATE` is idempotent (safe to run twice)
- [x] Svaythom High School rows are **not re-seeded** — only new registrations use the dispatch logic
- [x] `DATABASE_SAFETY.md` guard is in place for local dev protection
- [x] Non-KHM starter subjects are **not persisted globally** until `Subject` becomes tenant-safe

### Pre-deploy verification order
1. Run `npm run db:generate`
2. Run the relevant build checks (`services/school-service`, `apps/web`, or full `npm run build`)
3. Deploy schema with `ALLOW_PRODUCTION_DB=1 npx prisma migrate deploy`
4. Restart the affected services
5. Register or bootstrap a QA-only school and verify:
   - `educationModel`, `countryCode`, `defaultLanguage` saved correctly
   - academic terms match the selected model
   - holidays are only pre-loaded for `KHM_MOEYS`
   - non-KHM subjects remain manual and do not alter existing schools
6. Only after that, allow real production registrations to use the new model selector

---

## 7. Seeding Dispatch Table

The central function `getEducationModelDefaults(model, schoolType, year)` in `default-templates.ts` returns:

```typescript
interface EducationModelDefaults {
  subjects: SubjectRow[];
  subjectSeedMode: 'persisted' | 'template' | 'none';
  holidays: HolidayTemplate[];
  terms: TermTemplate[];
  examTypes: ExamTypeTemplate[];
  gradingScale: GradeRangeTemplate[];
  countryCode: string;
  defaultLanguage: string;
  seedDescription: {
    subjectCount: number;
    holidayCount: number;
    termCount: number;
    summary: string; // Human-readable, shown in the registration response
  };
}
```

### Dispatch rules

| `educationModel` | `countryCode` | `defaultLanguage` | Subjects | Holidays | Terms |
|---|---|---|---|---|---|
| `KHM_MOEYS` | `KH` | `km-KH` | 15 MoEYS per grade | 13 Cambodian | Semester 1 + 2 |
| `EU_STANDARD` | `GB` fallback (future form override allowed) | `en-GB` | Starter templates only in current rollout | 0 | Autumn + Spring |
| `INT_BACC` | `US` fallback (future form override allowed) | `en-US` | Starter templates only in current rollout | 0 | Term 1 + 2 + 3 |
| `CUSTOM` | `US` fallback (future form override allowed) | `en-US` | 0 | 0 | Term 1 + 2 |

### Generic subject set (used for EU_STANDARD / INT_BACC)
Mathematics, English Language, Sciences (combined), Social Studies, Physical Education, Arts & Culture — all with `coefficient: 1.0` and no Khmer `nameKh` hardcoding.

---

## 8. UI Adaptation Checklist

### Registration Form (`register-school/page.tsx`)
- [x] Add `educationModel` field to form state (default: `KHM_MOEYS`)
- [x] Add "Education System" dropdown with model options
- [x] Show a contextual hint below the dropdown describing what will be auto-seeded
- [x] Mark `KHM_MOEYS` as "🇰🇭 Cambodia Recommended"
- [x] Pass `educationModel` in the `POST /schools/register` body

### Welcome Step (`onboarding/steps/WelcomeStep.tsx`)
| Model | "What We've Set Up" copy |
|---|---|
| `KHM_MOEYS` | "13 Cambodian public holidays pre-loaded • 15 MoEYS subjects • 2 semesters" |
| `EU_STANDARD` | "2 terms ready • Starter subject suggestions ready for review • Add local holidays from Settings" |
| `INT_BACC` | "3 terms ready • IB-style starter subject suggestions ready for review • Add local holidays from Settings" |
| `CUSTOM` | "No defaults seeded — you'll set up everything in the next steps" |

### Calendar Step (`onboarding/steps/CalendarStep.tsx`)
- Holidays list driven from `onboardingData.academicYear.calendars[0].events` (not hardcoded)
- Non-KHM models show a banner: "No holidays pre-loaded. Add your country's public holidays from Settings → Academic Calendar."

### Subjects Step (`onboarding/steps/SubjectsStep.tsx`)
- `KHM_MOEYS` shows the seeded subject preview.
- `EU_STANDARD` / `INT_BACC` show starter subject suggestions plus a safety note explaining why they are still manual.
- `CUSTOM` shows a blank-state curriculum setup message.

---

## 9. File-by-File Implementation Checklist

| File | Change | Priority |
|---|---|---|
| `packages/database/prisma/schema.prisma` | Add `EducationModel` enum + fields on `School` | 1 |
| `packages/database/prisma/migrations/20260414_.../migration.sql` | New migration (nullable ADD COLUMN + UPDATE backfill) | 1 |
| `services/school-service/src/utils/default-templates.ts` | Add `GENERIC_SUBJECTS` + `getEducationModelDefaults()` function | 2 |
| `services/school-service/src/validators/school.validator.ts` | Add `educationModel` to `registerSchoolSchema` | 3 |
| `services/school-service/src/index.ts` | Use `getEducationModelDefaults()` in `POST /schools/register` | 3 |
| `apps/web/src/app/[locale]/register-school/page.tsx` | Add Education System dropdown | 4 |
| `apps/web/src/app/[locale]/onboarding/steps/WelcomeStep.tsx` | Model-conditional copy | 5 |
| `apps/web/src/app/[locale]/onboarding/steps/CalendarStep.tsx` | Data-driven holidays, non-KHM banner | 5 |
| `apps/web/src/app/[locale]/onboarding/steps/SubjectsStep.tsx` | Show seeded vs manual subject setup honestly by model | 5 |
| `README.md` | Link this rollout note from the root onboarding docs list | 6 |
