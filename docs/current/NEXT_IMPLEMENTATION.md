# Next Implementation

**Last Updated:** March 22, 2026

This roadmap is based on the latest code and live verification pass. It avoids older completed milestone items.

## Priority 1

### QA-school regression coverage

The project now has an isolated QA-school bootstrap flow and a known-good non-production school for feature validation. The next step is to make that coverage repeatable instead of relying on one-off manual runs.

Goals:

- Run onboarding/bootstrap in a single command
- Verify admin parent directory and admin-parent messaging automatically
- Verify dashboard counts, grades, attendance, timetable, and core school-management APIs against the QA school
- Keep `Svaythom High School` untouched during test data work

### Parent management depth

School admins can now view parents and reset parent passwords, but the support flow still needs a few operational actions to fully match student and teacher management quality.

Goals:

- Add parent invite or resend-instructions support
- Add link-unlink management between parent accounts and students
- Add guardian-role metadata such as primary guardian or relationship labels

## Priority 2

### Teacher linkage in shared dataset

Investigate why `GET /teachers/lightweight` returned `0` and why the tested class path did not expose a usable homeroom teacher object when academic-year linkage is incomplete.

Goals:

- Verify whether the issue is current data shape or an overly strict filter path
- Repair teacher-class or homeroom linkage scripts if the data is incomplete
- Add a smoke check for this path

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
