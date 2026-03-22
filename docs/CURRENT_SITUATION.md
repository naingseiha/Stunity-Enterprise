# Current Situation

**Last Verified:** March 22, 2026  
**Scope:** Repo structure, active documentation, and live API smoke-test status

This document is the quickest way to understand what is true in the project right now, without reading older planning or evaluation documents first.

---

## Active Source Of Truth

These are the primary current docs:

- [`README.md`](../README.md) as the single developer entrypoint
- [`current/DEVELOPER_GUIDE.md`](./current/DEVELOPER_GUIDE.md) for setup and architecture orientation
- [`current/PROJECT_STATUS.md`](./current/PROJECT_STATUS.md) for current verified status
- [`current/CURRENT_FEATURES.md`](./current/CURRENT_FEATURES.md) for the feature matrix
- [`current/NEXT_IMPLEMENTATION.md`](./current/NEXT_IMPLEMENTATION.md) for current priorities
- [`README.md`](./README.md) for the docs index and subsystem deep dives

Historical analyses, completed plans, and duplicate strategy docs were moved out of the project root into [`docs/archive/root-archive`](./archive/root-archive).

---

## Documentation Cleanup Completed

The following completed or historical root docs were archived on March 22, 2026:

- `FEED_ALGORITHM_ENHANCEMENT_ANALYSIS.md`
- `PROJECT_EVALUATION_REPORT.md`
- `STRATEGY_FEED_FEATURES.md`
- `STRATEGY_FEED_FEATURES_COPY.md`
- `plan.md`

The project root now keeps only one active markdown entrypoint:

- `README.md`

The other active project docs were centralized under `docs/current/`.

Ad hoc root-level test scripts were also cleaned up and moved into [`scripts/testing/manual`](../scripts/testing/manual).
Additional root helper scripts were organized into [`scripts/admin`](../scripts/admin), [`scripts/debug`](../scripts/debug), and [`scripts/seeding`](../scripts/seeding).

---

## Verified Runtime Reality

The current shared development database does not match the older `Test High School` seed docs.

What is actually present now:

- Active school in shared dev DB: `Svaythom High School`
- Working verified admin login: `admin@svaythom.edu.kh`
- Shared dev DB contains real school data, including:
  - `2` academic years
  - `33` classes
  - `1705` students
  - `77` teachers
  - `3` clubs

This means older seed-based credentials and examples should be treated as historical unless you reseed your own local environment.

---

## Live API Smoke Test

On March 22, 2026, the following local services were started and verified successfully:

- Auth service on `3001`
- Teacher service on `3004`
- Class service on `3005`
- Grade service on `3007`
- Attendance service on `3008`
- Timetable service on `3009`
- Messaging service on `3011`
- Club service on `3012`

Authenticated checks that passed with the current school-admin account:

- `POST /auth/login` returned `200`
- `GET /classes/academic-years` returned `2` records
- `GET /classes/my` returned `33` classes for the admin account
- `GET /classes/:id/students` returned `46` students for the first tested class
- `GET /classes/:id/announcements` returned `1` record
- `GET /classes/:id/materials` returned `0` records
- `GET /classes/:id/assignments` returned `0` records
- `GET /grades/class-report/:classId` returned `46` results
- `GET /attendance/class/:classId/summary` returned successfully
- `GET /timetable/class/:classId` returned `13` periods across `5` days
- `GET /clubs?page=1&limit=5` returned `3` clubs

---

## Known Current Caveats

- The old README login for `john.doe@testhighschool.edu` is stale for the current shared database.
- `GET /conversations` returned `403` for the admin account during verification. This looks like role-based access behavior, not a service outage.
- `GET /teachers/lightweight` returned `0` for the tested academic year with the current admin account and current data.
- The first class returned by `/classes/my` did not include a usable homeroom teacher object during the smoke test, so teacher-detail verification was inconclusive for that path.
- Destructive database commands are intentionally blocked when pointed at Supabase unless explicitly overridden. See [`DATABASE_SAFETY.md`](./DATABASE_SAFETY.md).

---

## Practical Guidance

If you are jumping into the project now:

1. Read [`README.md`](../README.md) for startup steps and the documentation map.
2. Read [`current/DEVELOPER_GUIDE.md`](./current/DEVELOPER_GUIDE.md) for architecture context.
3. Use [`current/PROJECT_STATUS.md`](./current/PROJECT_STATUS.md) and [`current/NEXT_IMPLEMENTATION.md`](./current/NEXT_IMPLEMENTATION.md) to choose work.
4. Use archived docs only when you need historical rationale for a completed feature or refactor.
