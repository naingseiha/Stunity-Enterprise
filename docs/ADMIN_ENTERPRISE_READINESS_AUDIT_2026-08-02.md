# Stunity Admin Panel — Enterprise Readiness Audit

**កាលបរិច្ឆេទ៖** 2 សីហា 2026
**Scope៖** Web Admin Panel, multi-school/multi-academic-year architecture, self-registration/onboarding, authorization, core SIS workflows, enterprise operations និង Social Learning integration។

## Executive verdict

Stunity មានគ្រឹះជា **SIS + LMS + Social Learning platform** ខ្លាំង និងមាន UI ដែលមើលទៅទំនើបជាង school-management products ជាច្រើន។ វាសមស្របសម្រាប់ pilot និង production របស់សាលាមួយៗ បន្ទាប់ពីបិទ reliability/security gaps សំខាន់ៗខាងក្រោម។ ប៉ុន្តែវា **មិនទាន់ជា full enterprise school ERP** ទេ ព្រោះ finance, HR/payroll, health, library/assets, transport, advanced admissions CRM, interoperability និង governance controls មួយចំនួនមិនទាន់មាន។

- Enterprise visual quality: **7.5/10**
- Core SIS completeness: **8/10**
- Full school ERP completeness: **5/10**
- Enterprise security/governance: **5.5/10**
- Social learning differentiation: **9/10**
- Overall enterprise readiness: **6.5/10**

**សេចក្តីសម្រេច៖**

- Pilot / controlled single-school production: **Ready with conditions**
- Paid multi-school SaaS rollout: **Needs P0/P1 hardening first**
- District/large enterprise or “all-in-one school ERP”: **Not complete yet**

## What is already strong

### 1. Core school operations

ប្រព័ន្ធមាន flow សំខាន់ៗដែល SIS ត្រូវការ៖

- Students, teachers, parents, classes និង subjects
- Admissions intake និង application events
- Academic years, terms, calendars, grading scales និង exam types
- Student enrollment history, transfers, progression/promotion និង year-end workflow
- Grades, monthly summaries, report cards, transcripts និង certificates
- Student/teacher attendance, monthly entry, monitoring និង delegation controls
- Timetable builder, shifts, publish state, conflict exceptions និង templates
- Parent portal, student portal, teacher flows, messaging និង notifications
- Cambodia MoEYS education model និង localized reporting

### 2. Multi-tenant and onboarding foundation

- `School` ជា tenant root ហើយ core data មាន `schoolId` scoping។
- Self-service school registration បង្កើត pending school, admin, academic-year defaults និង onboarding checklist។
- Pending schools មាន `PENDING_REVIEW` access scope និង high-risk action gates មុន super-admin approval។
- `SchoolMembership` និង school-link audit models មានរួច ប៉ុន្តែ frontend នៅតែប្រើ active school តែមួយ និងមិនទាន់មាន school switcher ពេញលេញ។

### 3. Differentiation

Social feed, clubs, events, messaging, quizzes, live quiz, courses, assignments, learning paths, gamification, streaks, certificates និង teacher analytics ជាចំណុចខុសគេធំ។ Products ដទៃជាច្រើនត្រូវភ្ជាប់ SIS និង LMS/social tools ដាច់ពីគ្នា ខណៈ Stunity មាន shared identity និង data model ក្នុង ecosystem តែមួយ។

### 4. Visual and responsive quality

Desktop Admin workspace មាន៖

- Clear grouped navigation និង feature search
- Consistent cards, charts, breadcrumbs និង action hierarchy
- Academic-year context នៅក្នុង global header
- Useful density controls, filters, import/export actions និង responsive tables
- Responsive behavior ល្អនៅ 390px; មិនឃើញ horizontal overflow នៅ dashboard និង student management

## Findings that block enterprise confidence

### P0 — Must fix before broad rollout

#### 1. Granular RBAC is documented but not active end to end

`packages/utils/permissions.ts` និង admin-management API client មាន permission catalogue ប៉ុន្តែ active web navigation/pages មិនប្រើ `PermissionGuard` ហើយ API endpoints សម្រាប់ `/admin/admins/.../permissions` មិនមាននៅ auth service។ Core services ជាច្រើនពិនិត្យត្រឹម role sets ដូចជា `ADMIN`, `STAFF`, `SCHOOL_ADMIN`, `SUPER_ADMIN`។ នេះមានន័យថា “admin with limited permissions” មិនមែនជា enforceable security boundary នៅ backend ទេ។ Follow-up hardening បានបិទ academic-year mutation tree ទាំង consolidated និង legacy service សម្រាប់ non-admin roles រួច ប៉ុន្តែ granular permission model នៅតែត្រូវអនុវត្តទូទាំង modules។

Claim-code credentials ត្រូវបាន harden បន្ថែម៖ list/export/generate/revoke/email routes ឥឡូវអនុញ្ញាតតែ `ADMIN`, `SCHOOL_ADMIN` និង `SUPER_ADMIN`; `STAFF`, teacher, student និង parent ត្រូវបាន deny ទាំង backend និង active Web navigation/page flow។

**Required:** normalized role/permission assignments, one authorization library, backend enforcement per action, frontend route/menu gating និង negative authorization tests។

#### 2. Student census and account access were incorrectly conflated

Dashboard ដើមបង្ហាញ 1,726 students ខណៈ query ដែលយក intersection រវាង `isAccountActive = true` និង `StudentClass` បង្ហាញតែ 1,041។ Follow-up database verification បានបញ្ជាក់ថា **1,726 គឺជាចំនួនសិស្សពិតក្នុង class ឆ្នាំ 2025–2026**។ ក្នុងនោះ 674 records មាន legacy status `បិទបណ្តោះអាសន្ន` ប៉ុន្តែនៅតែជាសិស្សមាន class/enrollment; ពួកគេមិនត្រូវបាត់ពី census ទេ។ មាន 11 records ទៀតដែលមាន legacy `Student.classId` ត្រឹមត្រូវ ប៉ុន្តែខ្វះ `StudentClass` migration row។ Endpoint ឥឡូវរាប់ authoritative enrollment បូក migration fallback។ `Student.recordStatus` ត្រូវបានបន្ថែមជាលក្ខណៈ additive សម្រាប់ SIS lifecycle ខណៈ Social-account status derive ពី `User`, school-link និង membership records។ Read-only verification បញ្ជាក់ `students: 1726` និង official linked student accounts 0។

Scoped rollout បានបញ្ជាក់ migration ledger complete ហើយ apply 11 safe rows បានជោគជ័យ។ Post-commit canonical `StudentClass` = 1,726, fallback-only = 0, conflicts = 0, unrecognized statuses = 0 និង duplicate effective enrollments = 0។ Claim codes 51 មាន active/unclaimed flags ប៉ុន្តែ expired ទាំងអស់ (`usable = 0`) ដូច្នេះត្រូវ reissue មុន student launch។

#### 3. Consolidated onboarding status request lacked authentication

Login redirect សម្រាប់ pending school ទៅ onboarding ត្រឹមត្រូវ ប៉ុន្តែ initial onboarding status request មិនផ្ញើ JWT ទៅ protected consolidated endpoint។ Audit នេះបានបំបែក onboarding API ជា authenticated client ដែល reject មុន network call បើគ្មាន token និងមាន unit tests សម្រាប់ status/update/complete។ Automated register → login → onboarding → approval smoke test ពេញលេញនៅតែត្រូវបន្ថែម។

#### 4. Tenant isolation needs a dedicated automated test suite

Static inspection បង្ហាញ `schoolId` scoping និង school-access middleware នៅ core modules ប៉ុន្តែ tenant security មិនគួរពឹងលើ manual review។ ត្រូវមាន tests ដែល school A token មិនអាច read/write school B resources សម្រាប់ students, grades, attendance, timetable, reports, files, messages និង exports។

#### 5. UI promises more than authorization allows

School admin ឃើញ Platform menu ដែល link ទៅ super-admin language route ប៉ុន្តែ route guard បញ្ជូនគាត់ទៅ Feed។ Audit នេះបានលាក់ menu នេះសម្រាប់ non-super-admin users។ ត្រូវ audit menu/route/API access ជា permission matrix ទាំងមូល។

### P1 — Enterprise foundation

#### 1. Localization is incomplete

Scanner ដើមរកឃើញ **774 findings** ប៉ុន្តែវាមើលឃើញតែ Latin text និងរំលង Khmer literals។ Follow-up បានកែ scanner ឲ្យ bilingual ហើយ baseline ពិតបច្ចុប្បន្នគឺ **1,409 findings**: Web 1,356 និង Mobile 53។ ទំព័រ `/[locale]/settings/academic-years` ត្រូវបានបម្លែងចេញពី raw Khmer literals ទាំងអស់ទៅ locale messages, locale-aware dates/status/actions/modals/errors។

**Required:** `npm run i18n:check-hardcoded` ឥឡូវការពារមិនឲ្យ baseline 1,409 កើនឡើង។ បន្ទាប់ត្រូវកាត់បន្ថយ baseline ជាបន្តបន្ទាប់ ដោយផ្តល់អាទិភាព claim codes, discipline, attendance, onboarding/admin-critical pages និង translation QA screenshots។

#### 2. Audit and governance coverage is partial

មាន `AuditLog`, `PlatformAuditLog`, auth/link audit events និង retention សម្រាប់ platform logs ប៉ុន្តែមិនមាន evidence ថា sensitive actions ទាំងអស់ត្រូវបាន log ជាឯកភាព៖ grade edits/reopen, attendance edits, transcript generation, exports, permission changes, school settings និង user impersonation។

**Required:** immutable event taxonomy, actor/tenant/resource/before-after/request-id, retention policy, export និង alerting សម្រាប់ high-risk actions។

#### 3. Operational tooling was stale after service consolidation

Academic API ប្រើ port 3021 ប៉ុន្តែ `check-services.sh` នៅតែរាយ legacy ports 3002–3009 និងមិនបង្ហាញ consolidated service។ ក្នុង audit run ដំបូងវារាយ legacy services ថា down ទោះ architecture បាន consolidate។ Audit នេះបានបន្ថែម Academic API និង consolidated-mode notice ទៅ health script; start/deploy/runbook tools ផ្សេងទៀតនៅតែត្រូវ align ទៅ source of truth តែមួយ។

#### 4. Session policy needs enterprise tuning

Auth service default access token 30 days និង refresh token 365 days។ មាន session/revocation models និង password version controls ប៉ុន្តែ enterprise tenants ត្រូវ configurable idle/absolute timeout, device/session management, forced logout, conditional MFA និង step-up authentication សម្រាប់ exports/permissions/destructive actions។

#### 5. Accessibility has no conformance evidence

UI មាន semantic headings/tables និង mobile responsiveness ល្អ ប៉ុន្តែមិនមាន automated axe checks, keyboard workflow suite ឬ WCAG conformance record។ Target គួរតែជា WCAG 2.2 AA សម្រាប់ admin-critical flows។

### P2 — Product completeness gaps

#### Finance and business office

មិនទាន់មាន tuition/fee schedules, invoices, family accounts, payment plans, receipts, refunds, scholarships/financial aid, arrears, accounting exports, budgets ឬ subscription billing integration។ នេះជាគម្លាតធំបំផុតពី full school ERP។

#### HR and workforce

Teacher records មាន employment fields ខ្លះ ប៉ុន្តែមិនមាន staff contracts, payroll, leave, workload, appraisal, recruitment, timesheets និង benefits។

#### Student wellbeing and compliance

មិនទាន់មាន health clinic, allergies, medications, immunizations, emergency care plans, counselling, safeguarding cases, special education/IEP/interventions និង consent management។

#### Campus operations

មិនទាន់មាន library circulation, inventory/assets, procurement, maintenance/work orders, transport routes, canteen/meal accounts, hostel/boarding និង locker management។

#### Admissions depth

Admissions មាន intake/application/decision base ល្អ ប៉ុន្តែមិនទាន់មាន prospect CRM, inquiry sources, tour/interview scheduling, configurable checklists, committee review, document collection/e-signature, deposits និង re-enrollment contracts។

#### Interoperability

មិនឃើញ public versioned API programme, webhooks, OneRoster, Ed-Fi, SCIM provisioning, tenant-configurable SAML/OIDC, data mapping UI ឬ integration marketplace។ Enterprise customers ត្រូវការចំណុចទាំងនេះដើម្បីភ្ជាប់ LMS, identity, finance និង government reporting systems។

#### Organization hierarchy

Multi-school tenancy មាន ប៉ុន្តែមិនទាន់មាន district/group organization layer, cross-school reporting, shared policies, centralized staff, school switching និង delegated district administration។

## Benchmark against mature systems

PowerSchool SIS រាប់ flexible scheduling, attendance, grading, enrollment, family management, fees, health/immunizations, transcripts, mass scheduling, portals, integrations និង state reporting ជា SIS core surface។ Blackbaud បន្ថែម admissions CRM, contracts, tuition/billing, financial aid និង accounting integration។ ចំណែក education interoperability ecosystem ប្រើ OneRoster ឬ Ed-Fi ដើម្បីផ្លាស់ប្តូរ roster/academic data ជាមួយ tools ផ្សេងៗ។

Stunity ឈ្នះខ្លាំងលើ social learning, content engagement និង unified LMS experience; វាត្រូវបំពេញ business-office, governance និង interoperability layer ដើម្បីប្រកួតជា full enterprise suite។

Reference points:

- PowerSchool SIS: https://www1.powerschool.com/solutions/student-information-system/powerschool-sis/
- Blackbaud K–12 suite: https://www.blackbaud.com/solutions/organizational-and-program-management/education-management/k-12
- 1EdTech OneRoster: https://www.1edtech.org/standards/oneroster
- Ed-Fi Data Standard: https://docs.ed-fi.org/reference/data-exchange/data-standard/5/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/

## Recommended delivery roadmap

### Phase 0 — Trust the core (1–2 focused sprints)

1. Complete enrollment source-of-truth migration and cache invalidation.
2. Automate register → pending login → onboarding → approval → full-access flow.
3. Add cross-tenant negative tests for every core module.
4. Replace role-only admin access with enforced RBAC foundation.
5. Align navigation, route guards and API permissions.
6. Update health/start/deploy tooling for consolidated Academic API.
7. Add i18n CI baseline and migrate academic-year/onboarding/admin-critical pages.

### Phase 1 — Enterprise administration

1. Admin/staff directory with scoped roles and permission templates.
2. Comprehensive audit trail, retention, data export and backup/restore runbooks.
3. Organization groups/districts, school switcher and cross-school dashboards.
4. Configurable policies: sessions, MFA, data retention, grading locks and approvals.
5. Accessibility automation and keyboard acceptance tests.

### Phase 2 — Full school operations

Prioritize by target customer segment:

- Private schools: tuition/billing + contracts + financial aid first.
- Public schools: compliance/state/MoEYS reporting + health + interventions first.
- School groups: organization hierarchy + centralized analytics + integrations first.

After that, add HR/payroll, library/assets, transport and campus operations as modular products rather than placing every feature in one Admin menu.

### Phase 3 — Ecosystem scale

1. Versioned public APIs, webhooks and integration credentials.
2. OneRoster first; Ed-Fi mapping where district/government demand exists.
3. Tenant-configurable enterprise SSO and SCIM.
4. SLA/SLO dashboards, synthetic checks, disaster recovery drills and tenant-level usage/billing.

## Changes completed during this audit

1. Removed the inaccessible Platform/Language menu from regular school-admin navigation.
2. Corrected academic-year census semantics in both consolidated and legacy services: enrolled/class-assigned students remain in the total regardless of the imported legacy flag, with `StudentClass` plus a temporary legacy-class migration fallback.
3. Added authenticated, centralized service calls for onboarding status/update/complete.
4. Updated `check-services.sh` to detect the consolidated Academic API on port 3021 and explain which legacy ports may remain free.
5. Added authenticated onboarding API helpers and regression coverage for status, progress update and completion calls.
6. Added academic-year student-scope regression tests that assert `StudentClass`, tenant and academic-year boundaries.
7. Enforced administrative roles for every non-read academic-year route (including promotion, calendar and copy operations) in both consolidated and legacy services.
8. Fully localized the Academic Years management page, including locale-aware dates, statuses, actions, modals and API feedback.
9. Fixed the i18n scanner to detect Khmer literals and added a zero-regression baseline command, `npm run i18n:check-hardcoded`.
10. Separated student SIS lifecycle from Social identity with `Student.recordStatus`, account/link badges, migration-safe academic-year assignment fallback, and corrected directory/class/grade/report/messaging filters.
11. Added a school/year-scoped Student lifecycle rollout command with read-only preflight, conflict detection, transaction lock, explicit production confirmation, idempotent 11-row backfill and post-commit verification.
12. Restricted Claim Code credentials end to end to explicit administrators in consolidated API, legacy service, navigation, settings hub and page redirect flow.
13. Removed the non-functional bulk-password-reset alert; password reset remains an individual action available only for officially linked accounts.
14. Closed unauthenticated legacy onboarding batch routes for students, classes and teachers; every batch now requires an administrative JWT and exact target-school match, with explicit super-admin cross-school handling.
15. Added a shared fail-closed tenant policy and negative tests proving School A credentials cannot access or administer School B.
16. Protected legacy Auth notification bridges with timing-safe internal service-token authentication and updated Grade/Attendance callers to send the service credential.
17. Verified the deployed consolidated Academic and Engagement Cloud Run services both declare `NOTIFICATION_SERVICE_AUTH_TOKEN` (environment-variable names inspected; secret values were not exposed).
18. Deployed the consolidated Engagement and Academic APIs to production revisions `00008-nwf` and `00007-49f`; both serve 100% traffic and returned HTTP 200 health checks. Unauthorized internal-notification and Claim Code requests returned HTTP 401.
19. Deployed an isolated Web Admin release to Vercel production deployment `dpl_8tD8PTrHxMCDEQVVxQETU1ZycLwh` and aliased it to `stunity.app`; unrelated uncommitted landing-page work was excluded and the existing homepage remained unchanged.
20. Corrected the Student Directory summary contract so a selected academic year reports its 1,726 enrolled students independently from the school-wide total of 1,727 active SIS profiles; the one valid, unassigned admission profile is reported separately as outside the selected year.
21. Separated year-wide summary scope from class-filtered list scope, preventing students in other classes from being mislabeled as outside the academic year, and versioned server/browser caches to invalidate stale count payloads.
22. Deployed the precision fix to Academic API revision `stunity-academic-api-00008-bs8` and isolated Vercel deployment `dpl_5JkUmD5kdnZhLamo5YLNcidjLYr5`; both are live, and the unrelated landing redesign remains excluded.
23. Added a controlled first-launch Claim Code workflow with read-only default, explicit production/apply gates, serializable transaction, advisory lock, linked/pending-account protection, collision checking and a private non-overwriting CSV output.
24. Reduced production dependency findings from 55 to 37 through safe framework, service and transitive upgrades; documented the remaining Expo-major and Next vendor-pinned exceptions instead of using a breaking forced audit fix.
25. Migrated Firebase Admin notification integrations to modular APIs and moved Engagement/Notification container runtimes to Node 22, satisfying Firebase Admin 14's supported runtime requirement.
26. Deployed Engagement revision `stunity-engagement-api-00010-plw`, Academic revision `stunity-academic-api-00009-7nh` and isolated Web deployment `dpl_CuHbuBgmAB68NDQtWdwtrSEebcbZ`; all production smoke checks passed and the unreleased landing redesign remained excluded.
27. Implemented a shared, versioned RBAC policy with backward-compatible role defaults, explicit restrictive grants, fail-closed malformed-policy handling and school-tenant enforcement.
28. Added permission-management APIs with same-school boundaries, self-modification protection, token-version invalidation and transactional `PlatformAuditLog` evidence.
29. Enforced granular permissions on Claim Codes, academic-year lifecycle, school settings/onboarding, school-link review/unlink and administrative password reset in consolidated and compatibility paths.
30. Added a read-only production RBAC preflight; the current dataset is `READY` with 10 active administrators, no tenant/policy blockers and no data mutation.
31. Repaired the Expo configuration schema by removing two comment-only unsupported fields; Expo Doctor now passes 18/18 while all deep-link configuration remains intact.
32. Deployed the approved RBAC release to Engagement revision `stunity-engagement-api-00011-8hm` and Academic revision `stunity-academic-api-00010-6nc`; both serve 100% traffic with HTTP 200 health checks, the existing service token was preserved without disclosure, and the post-deploy RBAC audit remained `READY`.

## Verification evidence

- Desktop visual checks: dashboard, students, academic years and super-admin access behavior
- Mobile checks at 390×844: dashboard and students; no horizontal overflow observed
- Web Jest: **9/9 suites passed, 75/75 tests passed**
- Academic service targeted regression tests: **4/4 passed**
- TypeScript: Web, Academic API and School Service all passed `tsc --noEmit`
- i18n bilingual audit: **1,409 tracked findings** (Web 1,356, Mobile 53); zero-regression baseline gate passed
- Latest i18n gate: **1,401 findings** (Web 1,348, Mobile 53); baseline gate passed
- Student lifecycle rollout tests: **4/4 passed**
- Student Directory summary-contract tests: **5/5 passed**
- Student/administration scope tests: **9/9 passed**
- Read-only Svaythom rollout preflight: **READY** (11 safe candidates; 0 conflicts; 0 duplicate effective enrollments)
- Svaythom post-commit rollout: **READY** (11 inserted; canonical 1,726; fallback 0)
- Svaythom post-deploy rollout: **READY** (current-year census/canonical 1,726; one unassigned active SIS record correctly outside the selected year)
- Tenant policy negative tests: **4/4 passed**
- Auth/internal-notification and school-link security tests: **12/12 passed**
- Vercel production: **READY**; Students, Academic Years and Claim Codes routes returned HTTP 200 with security headers intact
- Follow-up production census: **READY**; selected-year total 1,726, outside-year 1, school-wide active SIS total 1,727
- Claim Code launch audit: **51/51 expired and unusable**, 51 distinct students, 9 pending school links; reissue intentionally deferred until the controlled student launch
- Controlled Claim Code launch tests: **5/5 passed**; Svaythom dry run **READY** for 1,717 planned credentials (42 expired replacements + 1,675 missing), with 9 pending links protected and **no apply executed**
- Production dependency audit: **55 → 37** findings; remaining 1 critical/8 high are isolated to the Expo major-upgrade path and Next-pinned PostCSS/Sharp dependencies
- Engagement revision `stunity-engagement-api-00010-plw`: **100% traffic**, supported Node 22 runtime, HTTP 200 health
- Academic revision `stunity-academic-api-00009-7nh`: **100% traffic**, HTTP 200 health
- Vercel deployment `dpl_CuHbuBgmAB68NDQtWdwtrSEebcbZ`: **READY** and aliased to `stunity.app`; five key routes returned HTTP 200, released homepage marker preserved, security headers intact
- Shared RBAC/tenant tests: **9/9 passed**; permission-management endpoint tests: **4/4 passed**
- Auth service security suite: **87/87 passed**; consolidated Engagement school-link/passwordless tests: **10/10 passed**
- Production RBAC audit: **READY**; 10/10 administrative users active, 0 malformed policies, 0 missing tenants, 0 projection mismatches
- Expo Doctor: **18/18 passed**; Mobile TypeScript passed
- Engagement RBAC revision `stunity-engagement-api-00011-8hm`: **100% traffic**, HTTP 200 health; unauthenticated permission-management and school-link requests returned HTTP 401
- Academic RBAC revision `stunity-academic-api-00010-6nc`: **100% traffic**, HTTP 200 health; Engagement URL wiring and the preserved service token match the Engagement service configuration
- Post-deploy production RBAC audit: **READY**; all 10 administrators remain active on backward-compatible role defaults, with 0 explicit or malformed policies and no student/academic data mutation

## Definition of “enterprise-ready” for the next gate

Do not label the Admin Panel enterprise-ready until all of these are demonstrable in CI/staging:

- No cross-tenant read/write path in automated negative tests
- RBAC enforced server-side for every sensitive action
- Register/onboard/approve/year-end flows pass end to end
- Dashboard, roster, reports and exports agree on counts
- Admin-critical pages meet bilingual and WCAG 2.2 AA acceptance checks
- Critical actions are auditable with retention and export
- Backup/restore and incident runbooks have been exercised
- Health tooling reflects the actual consolidated deployment
