# Enterprise RBAC Rollout Runbook

**Prepared:** 3 August 2026
**State:** deployed to production and verified on 3 August 2026.

## Policy model

Stunity now has one shared backend permission catalogue for Auth, Engagement, Academic and legacy School authorization. A stored explicit policy uses this versioned JSON shape:

```json
{
  "rbacVersion": 1,
  "grants": ["VIEW_DASHBOARD", "VIEW_REPORTS"]
}
```

- `SUPER_ADMIN` always receives the complete platform permission set.
- Existing `ADMIN`, `SCHOOL_ADMIN` and `STAFF` users without an explicit document retain backward-compatible role defaults.
- Once `rbacVersion: 1` exists, only recognized grants in that document are effective.
- Malformed explicit documents deny closed.
- Unknown permissions are rejected by the management API.
- Every school-scoped permission also requires exact tenant access; only `SUPER_ADMIN` may cross schools.

## Enforced high-risk actions

The first rollout gate enforces permissions for:

- Claim Code viewing, generation, export, revoke and delivery;
- academic-year create/update/archive/delete, calendar mutation and promotion workflows;
- school profile and onboarding-setting mutations;
- school-link listing, approval, rejection and destructive unlink;
- administrative password reset;
- administrator permission inspection and update.

## Permission management API

Both `/admin/...` and `/auth/admin/...` compatibility paths are supported:

- `GET /admin/permissions/available`
- `GET /admin/admins/:adminId/permissions`
- `PUT /admin/admins/:adminId/permissions`

Permission updates:

- require `MANAGE_ADMINS`;
- are restricted to the actor's school unless the actor is `SUPER_ADMIN`;
- cannot modify the actor's own permission set;
- cannot modify implicit `SUPER_ADMIN` permissions;
- increment `schoolAccessVersion` to invalidate existing access tokens;
- write `ADMIN_PERMISSIONS_UPDATED` to `PlatformAuditLog` in the same transaction.

## Production preflight

Run the read-only audit before every rollout:

```bash
npm run db:rbac:check
```

Optional scoped or JSON report:

```bash
SCHOOL_ID=<school-id> npm run db:rbac:check -- --json
```

Verified production result on 3 August 2026:

| Check | Result |
|---|---:|
| Administrative users | 10 |
| Active administrative users | 10 |
| ADMIN | 8 |
| SUPER_ADMIN | 2 |
| Legacy role-default policies | 10 |
| Explicit policies | 0 |
| Malformed policies | 0 |
| Unknown-grant policies | 0 |
| Missing school tenants | 0 |
| Super-admin projection mismatches | 0 |
| Readiness | READY |

No database data was changed by the preflight.

## Verification evidence

- Shared RBAC and tenant negative tests: 9/9 passed.
- Permission-management endpoint tests: 4/4 passed.
- Auth service suite: 87/87 passed.
- Consolidated Engagement school-link/passwordless tests: 10/10 passed.
- Auth, Engagement, Academic and legacy School TypeScript builds passed.
- Web and Mobile TypeScript checks passed.
- Expo Doctor passed 18/18 after removing two invalid comment-only fields from `app.json`; deep-link and associated-domain settings remain unchanged.

## Production deployment record

- Engagement/Auth revision `stunity-engagement-api-00011-8hm` serves 100% traffic and returned HTTP 200 from `/health`.
- Academic revision `stunity-academic-api-00010-6nc` serves 100% traffic and returned HTTP 200 from `/health`.
- Unauthenticated Engagement permission-management and school-link requests returned HTTP 401.
- Academic's `ENGAGEMENT_API_URL` matches the deployed Engagement service URL.
- `NOTIFICATION_SERVICE_AUTH_TOKEN` remained configured and matched across both services; its value was never printed or written to rollout evidence.
- The post-deploy production RBAC audit remained `READY`: 10/10 administrative users active, 0 malformed policies, 0 unknown grants, 0 missing tenants and 0 super-admin projection mismatches.
- The rollout did not create explicit policies or mutate student, enrollment, score, attendance or Claim Code data.

## Production rollout and rollback

The production rollout followed the required order: Engagement/Auth first, followed by health and unauthenticated-boundary checks, then Academic and its health/environment checks. Before assigning any explicit policy, test a legacy administrator interactively. Next, assign a restricted test administrator and prove denied Claim Code, academic-year and cross-school actions return HTTP 403 while granted reads still work.

Rollback is revision-based: restore 100% traffic to the prior Engagement and Academic Cloud Run revisions. Explicit permission documents are backward-compatible data, but if one was assigned during a failed rollout, restore that user's previous `permissions` document through an audited administrator action before ending the incident.

## Remaining RBAC expansion

The current gate covers the highest-risk Admin actions. Follow-up modules must adopt the same shared policy for student write/export, teacher write, grade lock/reopen, attendance correction, report export and organization-level administration before the platform is labelled fully enterprise-ready.
