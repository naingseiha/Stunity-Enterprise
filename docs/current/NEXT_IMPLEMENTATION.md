# Next Implementation

**Last Updated:** March 22, 2026

This roadmap is based on the latest code and live verification pass. It avoids older completed milestone items.

## Priority 1

### Messaging access rules

Clarify and fix the current `403` from [`services/messaging-service/src/index.ts`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/services/messaging-service/src/index.ts) for the tested school-admin account.

Goals:

- Decide whether school admins should be allowed to list conversations
- If yes, align authorization and seed data
- If no, document the expected behavior clearly in active docs

### Teacher linkage in shared dataset

Investigate why `GET /teachers/lightweight` returned `0` and why the tested class path did not expose a usable homeroom teacher object.

Goals:

- Verify whether the issue is service logic, filters, or current data shape
- Repair seeding or linkage scripts if the data is incomplete
- Add a smoke check for this path

## Priority 2

### Automated smoke test coverage

Turn the manual March 22 verification into a repeatable script under [`scripts/testing`](/Users/naingseiha/Documents/projects/Stunity-Enterprise/scripts/testing).

Good first scope:

- Login
- Academic years
- My classes
- Class students
- Grades
- Attendance summary
- Timetable
- Clubs

## Priority 3

### Startup script consistency

The repo now has clearer docs, but the startup scripts still deserve a consistency pass.

Targets:

- Keep credential messaging aligned with the current shared dataset
- Document the difference between active runtime services and placeholder service folders
- Decide whether `quick-start.sh` and `start-all-services.sh` should keep distinct roles or be unified

## Priority 4

### Continue doc pruning in deep-dive docs

The active docs are now centralized, but some subsystem docs still include old release-note phrasing.

Recommended approach:

1. Update active non-archived docs when you touch that subsystem.
2. Move obsolete milestone-style notes into archive instead of layering more corrections on top.
3. Keep claims scoped to either `implemented in code` or `live-verified`.
