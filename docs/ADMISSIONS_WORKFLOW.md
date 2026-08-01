# Admissions workflow

## Purpose

Admissions is the intake register for a school and an academic year. It is not
the source of truth for an existing student's grade progression. A new student
becomes an official `Student` only after an authorized reviewer approves and
enrolls the application.

## Phase 1: staff-assisted intake

This is the currently supported phase.

- `TEACHER`, `STAFF`, `SCHOOL_ADMIN`, `ADMIN`, and `SUPER_ADMIN` can receive an
  application on behalf of a family.
- `STAFF`, `SCHOOL_ADMIN`, `ADMIN`, and `SUPER_ADMIN` can review, approve,
  reject, and enroll a new-student application.
- Every application belongs to the authenticated user's school and one academic
  year.
- A new-student application contains identity, contact, family, address,
  previous-study, requested-placement, and intake-note data.
- Duplicate active applications are checked by school, academic year, name, and
  date of birth.
- Enrollment creates the official student and optionally a `StudentClass`
  placement in one transaction. Placement can be deferred.
- Status changes and enrollment are recorded as application events.

### New-student state flow

`RECEIVED -> UNDER_REVIEW -> APPROVED -> ENROLLED`

`RECEIVED`, `UNDER_REVIEW`, and `WAITLISTED` may also move to `REJECTED`.
Rejection requires a reason. Enrollment is available only from `APPROVED`.

### Returning students

A returning-student submission is only a receipt record. The intake form links
the existing student and copies identity data from the student record. It does
not create another student, choose the next class, or change progression.

Promotion and repetition remain in the Year-End workflow through
`StudentProgression`. This separation prevents admissions intake from becoming
a second, conflicting grade-progression system.

## Phase 2: student or parent self-service

Self-service should reuse `AdmissionApplication` but must be implemented as a
separate public workflow rather than opening the staff endpoint.

Required controls before release:

- school-specific intake link or code and an open/close intake window;
- OTP verification of the applicant's phone or email;
- rate limiting, bot protection, and enumeration-safe duplicate handling;
- draft saving and explicit consent before submission;
- file type, size, malware, and access controls for supporting documents;
- source set to `SELF_SERVICE` and status set to `RECEIVED` only after submit;
- no ability for an applicant to approve, enroll, or select an internal class;
- staff review queue and notifications.

## Phase 3: cross-school transfer-in

Transfer-in should not expose one school's student records directly to another
school. Use a consent-based transfer request with a signed, expiring token.

Recommended flow:

1. The source school or guardian initiates a transfer request.
2. The receiving school accepts it for a target academic year.
3. The platform copies an approved, minimal transfer snapshot rather than
   sharing live records.
4. The receiving school reviews the `TRANSFER_IN` admission and creates its own
   school-scoped enrollment.
5. Both schools retain immutable transfer events for audit.

The transfer snapshot should include identity, last enrollment, progression,
official transcript references, and guardian consent. Attendance, discipline,
health, and private notes require explicit policy and permission decisions
before inclusion.

## Operational readiness checklist

- Apply the admissions database migration before deploying the service and web
  application.
- Confirm the current and next academic years and their classes exist.
- Test each permitted role and verify teachers cannot approve or enroll.
- Test duplicate submission and double-click enrollment behavior.
- Test enrollment both with immediate class placement and with placement
  deferred.
- Confirm new students appear in the active student register and that returning
  submissions do not change their class.
- Confirm Khmer and English layouts on desktop and mobile.
