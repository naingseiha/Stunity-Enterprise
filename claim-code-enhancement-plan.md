# Claim Code Enhancement Plan
## Two-Step Verification + Admin Approval Workflow

**Goal:** Prevent users from linking their account to the wrong school profile by:
1. Showing a verification alert (Name, Class, School) before linking — using the existing `/auth/claim-codes/validate` endpoint.
2. Requiring admin approval before the link becomes permanent and active.

**Safety Principle:** Every step is additive. No existing field is removed or renamed. The current instant-link flow continues to work as a fallback while the new approval layer is added on top.

---

## Existing Codebase — What Already Works (Do Not Break)

Before making any changes, understand what already exists:

| Component | File | What it Does |
|---|---|---|
| `POST /auth/claim-codes/validate` | `auth-service/src/index.ts:2096` | Validates a code and returns school + student/teacher preview data. Already fully implemented. |
| `POST /auth/claim-codes/link` | `auth-service/src/index.ts:2217` | Immediately links the account, sets `role`, `schoolId`, `studentId`/`teacherId`, and marks the claim code as `claimedAt`. |
| `linkClaimCode(code)` | `apps/mobile/src/stores/authStore.ts:470` | Calls `/auth/claim-codes/link` and refreshes the user session. |
| `LinkSchoolCard.tsx` | `apps/mobile/src/screens/profile/components/LinkSchoolCard.tsx` | UI card where users enter their claim code. Currently calls `linkClaimCode` directly without a preview step. |
| Admin Claim Codes Page | `apps/web/src/app/[locale]/admin/claim-codes/page.tsx` | Existing admin page for generating and viewing codes. A new "Pending Approvals" tab will be added here. |
| `ClaimCode` model | `packages/database/prisma/schema.prisma:1544` | Has `verificationData`, `claimedAt`, `claimedByUserId`, `isActive`, etc. No `linkingStatus` here — it lives on `User`. |

---

## Implementation Phases

### Phase 1 — Database Schema Changes (Foundation)
### Phase 2 — Backend: Auth Service Changes
### Phase 3 — Mobile App: Two-Step UX
### Phase 4 — Admin Panel: Approval UI
### Phase 5 — Verification & Testing

---

## Phase 1: Database Schema Changes

**File:** `packages/database/prisma/schema.prisma`

### 1.1 — Add `LinkingStatus` Enum

Add this enum near the bottom of the file, before the closing of the enums section:

```prisma
enum LinkingStatus {
  NONE
  PENDING
  APPROVED
  REJECTED
}
```

### 1.2 — Add Fields to `User` Model

Locate the `User` model (starts around line 400+). Add these two fields:

```prisma
// Inside model User { ... }
linkingStatus   LinkingStatus @default(NONE)
pendingLinkData Json?
```

**What `pendingLinkData` stores (JSON schema):**
```json
{
  "code": "STNT-XXXX-YYYY",
  "schoolId": "school-stunity-academy-001",
  "schoolName": "Stunity Academy",
  "type": "STUDENT",
  "studentId": "student-abc",
  "teacherId": null,
  "submittedAt": "2026-03-27T08:00:00.000Z"
}
```

### 1.3 — Run Migration

```bash
# From project root
cd packages/database
npx prisma migrate dev --name add_linking_status_to_user
npx prisma generate
```

> **Safety Check:** This migration only ADDS new nullable columns with defaults. It does not alter or drop any existing columns. Zero data loss risk.

---

## Phase 2: Backend — Auth Service Changes

**File:** `services/auth-service/src/index.ts`

### 2.1 — Update `POST /auth/claim-codes/validate` (Minor Change)

The endpoint already exists and works. The only addition is to include `className` in the student/teacher select, so the mobile confirmation alert can show the class name.

**Find the student `select` block (around line 2127) and add `classEnrollments`:**

```typescript
student: {
  select: {
    id: true,
    studentId: true,
    firstName: true,
    lastName: true,
    dateOfBirth: true,
    gender: true,
    // ADD: include class info for the confirmation alert
    classEnrollments: {
      where: { isActive: true },
      take: 1,
      include: {
        class: { select: { name: true, gradeLevel: true } },
      },
    },
  },
},
```

**Update the response data to include the class:**

```typescript
res.json({
  success: true,
  data: {
    code: claimCode.code,
    type: claimCode.type,
    school: claimCode.school,
    student: claimCode.student
      ? {
          ...claimCode.student,
          className: claimCode.student.classEnrollments?.[0]?.class?.name || null,
          gradeLevel: claimCode.student.classEnrollments?.[0]?.class?.gradeLevel || null,
        }
      : null,
    teacher: claimCode.teacher || null,
    expiresAt: claimCode.expiresAt,
    requiresVerification: !!claimCode.verificationData,
  },
});
```

### 2.2 — Modify `POST /auth/claim-codes/link` (Core Change)

This is the most critical change. The endpoint currently immediately applies the link. We need to change it to set `linkingStatus = PENDING` instead of immediately applying the role/schoolId.

**Replace the current transaction and response logic with:**

```typescript
// --- REPLACE the $transaction block and response (lines ~2308–2431) ---

// Store pending link data — do NOT apply role/schoolId yet
await prisma.user.update({
  where: { id: userId },
  data: {
    linkingStatus: 'PENDING',
    pendingLinkData: {
      code: claimCode.code,
      schoolId: claimCode.school.id,
      schoolName: claimCode.school.name,
      type: claimCode.type,
      studentId: claimCode.studentId || null,
      teacherId: claimCode.teacherId || null,
      submittedAt: new Date().toISOString(),
    },
  },
});

// Return pending status — do NOT issue a new token yet
res.json({
  success: true,
  message: 'Link request submitted. Awaiting admin approval.',
  data: {
    linkingStatus: 'PENDING',
    school: {
      id: claimCode.school.id,
      name: claimCode.school.name,
    },
  },
});
```

> **Safety Note:** The `ClaimCode.claimedAt` is NOT set here yet. The code is only marked as claimed on admin approval. This prevents the code from being permanently consumed if the admin rejects the request.

> **Idempotency Guard:** Add this check at the top of the link endpoint, before any other logic:
```typescript
const existingUser = await prisma.user.findUnique({ where: { id: userId } });
if (existingUser?.linkingStatus === 'PENDING') {
  return res.status(409).json({
    success: false,
    error: 'You already have a pending link request. Please wait for admin approval.',
  });
}
if (existingUser?.schoolId) {
  return res.status(409).json({
    success: false,
    error: 'Your account is already linked to a school.',
  });
}
```

### 2.3 — Add `GET /auth/admin/pending-links` (New Endpoint)

```typescript
/**
 * GET /auth/admin/pending-links
 * Returns all users with linkingStatus = PENDING for a given school
 * Requires admin authentication
 */
app.get('/auth/admin/pending-links', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.query;

    // Only ADMIN or SUPER_ADMIN can access
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const pendingUsers = await prisma.user.findMany({
      where: {
        linkingStatus: 'PENDING',
        // Filter by school from their pendingLinkData (stored as JSON)
        // We use a raw filter or post-filter
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePictureUrl: true,
        pendingLinkData: true,
        createdAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Post-filter by schoolId if provided
    const filtered = schoolId
      ? pendingUsers.filter((u: any) => (u.pendingLinkData as any)?.schoolId === schoolId)
      : pendingUsers;

    res.json({ success: true, data: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch pending links' });
  }
});
```

### 2.4 — Add `POST /auth/admin/approve-link/:userId` (New Endpoint)

```typescript
/**
 * POST /auth/admin/approve-link/:userId
 * Approves a pending school link request and applies the role/schoolId
 */
app.post('/auth/admin/approve-link/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.linkingStatus !== 'PENDING') {
      return res.status(404).json({ success: false, error: 'No pending link request found for this user' });
    }

    const pendingData = user.pendingLinkData as any;
    if (!pendingData?.code || !pendingData?.schoolId) {
      return res.status(400).json({ success: false, error: 'Invalid pending link data' });
    }

    // Find the claim code
    const claimCode = await prisma.claimCode.findUnique({
      where: { code: pendingData.code },
      include: { school: true, student: true, teacher: true },
    });

    if (!claimCode) {
      return res.status(404).json({ success: false, error: 'Claim code no longer exists' });
    }

    if (claimCode.claimedAt && claimCode.claimedByUserId !== userId) {
      return res.status(409).json({ success: false, error: 'Claim code was already used by another user' });
    }

    // Apply the link in a transaction
    await prisma.$transaction(async (tx) => {
      let finalStudentId = pendingData.studentId || null;
      let finalTeacherId = pendingData.teacherId || null;

      // Create Teacher profile if needed
      if (pendingData.type === 'TEACHER' && !finalTeacherId) {
        const newTeacher = await tx.teacher.create({
          data: {
            schoolId: pendingData.schoolId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || null,
            gender: 'MALE',
            customFields: { regional: { position: 'Teacher' } } as any,
          },
        });
        finalTeacherId = newTeacher.id;
      }

      // Create Student profile if needed
      if (pendingData.type === 'STUDENT' && !finalStudentId) {
        const newStudent = await tx.student.create({
          data: {
            schoolId: pendingData.schoolId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            customFields: { regional: { displayName: `${user.firstName} ${user.lastName}` } },
            dateOfBirth: new Date().toISOString(),
            gender: 'MALE',
          } as any,
        });
        finalStudentId = newStudent.id;
      }

      // Now apply role, schoolId, and clear pending data
      await tx.user.update({
        where: { id: userId },
        data: {
          role: pendingData.type === 'TEACHER' ? 'TEACHER' : 'STUDENT',
          schoolId: pendingData.schoolId,
          accountType: 'HYBRID',
          organizationCode: pendingData.schoolId,
          organizationName: pendingData.schoolName,
          socialFeaturesEnabled: true,
          linkingStatus: 'APPROVED',
          pendingLinkData: undefined, // clear
          ...(finalStudentId && { studentId: finalStudentId }),
          ...(finalTeacherId && { teacherId: finalTeacherId }),
        },
      });

      // Mark the claim code as claimed NOW (only on approval)
      await tx.claimCode.update({
        where: { id: claimCode.id },
        data: {
          claimedAt: new Date(),
          claimedByUserId: userId,
        },
      });
    });

    // Send in-app notification to the user
    await prisma.notification.create({
      data: {
        recipientId: userId,
        type: 'SYSTEM',
        title: 'School Account Linked ✅',
        message: `Your account has been approved and linked to ${pendingData.schoolName}.`,
      },
    });

    res.json({ success: true, message: 'Account link approved successfully.' });
  } catch (error: any) {
    console.error('Approve link error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve link request' });
  }
});
```

### 2.5 — Add `POST /auth/admin/reject-link/:userId` (New Endpoint)

```typescript
/**
 * POST /auth/admin/reject-link/:userId
 * Rejects a pending school link request and resets the user's status
 */
app.post('/auth/admin/reject-link/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.linkingStatus !== 'PENDING') {
      return res.status(404).json({ success: false, error: 'No pending request found' });
    }

    const pendingData = user.pendingLinkData as any;

    // Reset user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        linkingStatus: 'NONE',  // Reset so they can try again
        pendingLinkData: undefined,
      },
    });

    // Notify the user
    await prisma.notification.create({
      data: {
        recipientId: userId,
        type: 'SYSTEM',
        title: 'School Link Request Rejected',
        message: reason
          ? `Your request to link to ${pendingData?.schoolName} was rejected: ${reason}`
          : `Your request to link to ${pendingData?.schoolName} was not approved. Please contact your school admin.`,
      },
    });

    res.json({ success: true, message: 'Link request rejected.' });
  } catch (error: any) {
    console.error('Reject link error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject link request' });
  }
});
```

### 2.6 — Update `GET /auth/verify` Response

The mobile app calls `/auth/verify` on startup and after refresh. We need to include `linkingStatus` so the mobile app can show the correct state.

**Find the `res.json` inside `/auth/verify` (around line 2052) and add `linkingStatus`:**

```typescript
// Inside the verify response user object:
user: {
  id: user.id,
  email: user.email,
  // ... all existing fields ...
  schoolId: user.schoolId,
  linkingStatus: user.linkingStatus, // ADD THIS
  isSuperAdmin: user.role === 'SUPER_ADMIN',
  ...(children && { children }),
},
```

---

## Phase 3: Mobile App — Two-Step UX Flow

### 3.1 — Add `validateClaimCode` to `authStore.ts`

**File:** `apps/mobile/src/stores/authStore.ts`

**Step 1:** Add the return type and action to the `AuthState` interface:

```typescript
// In AuthState interface
validateClaimCode: (code: string) => Promise<{
  success: boolean;
  data?: {
    type: string;
    school: { id: string; name: string };
    student?: { firstName: string; lastName: string; className?: string } | null;
    teacher?: { firstName: string; lastName: string } | null;
  };
  error?: string;
}>;
```

**Step 2:** Add `linkingStatus` to the `User` type (in `@/types`) if not present, OR handle it from the verify response.

**Step 3:** Implement the action inside the store:

```typescript
validateClaimCode: async (code: string) => {
  try {
    const response = await authApi.post('/auth/claim-codes/validate', { code });
    if (!response.data.success) {
      return { success: false, error: response.data.error || 'Invalid claim code' };
    }
    return { success: true, data: response.data.data };
  } catch (error: any) {
    const message = error?.response?.data?.error || error?.message || 'Failed to validate code';
    return { success: false, error: message };
  }
},
```

### 3.2 — Update `linkClaimCode` in `authStore.ts`

The existing `linkClaimCode` now hits the modified endpoint (which returns PENDING instead of immediately linking). The existing code structure mostly works — but we need to:

1. **Remove** the token refresh logic (no new token is issued in PENDING state).
2. **Add** optimistic local state update to reflect PENDING status.

```typescript
linkClaimCode: async (code: string) => {
  try {
    set({ isLoading: true, error: null });
    const response = await authApi.post('/auth/claim-codes/link', { code });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to submit link request');
    }

    // Update local user state to reflect pending status
    // (no new token — schoolId/role not applied yet)
    const { user } = get();
    if (user) {
      set({
        user: { ...user, linkingStatus: 'PENDING' },
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }

    return { success: true };
  } catch (error: any) {
    const message = error?.response?.data?.error || error?.message || 'Failed to link claim code';
    set({ isLoading: false, error: message });
    return { success: false, error: message };
  }
},
```

### 3.3 — Rewrite `LinkSchoolCard.tsx` — Two-Step UI

**File:** `apps/mobile/src/screens/profile/components/LinkSchoolCard.tsx`

The card needs two states:
- **Step 1 (Enter Code):** Text input + "Verify" button → calls `validateClaimCode`
- **Step 2 (Confirm):** Shows name/class/school info + "Confirm & Submit" button → calls `linkClaimCode`
- **Step 3 (Pending):** Shows "Awaiting Admin Approval" message — this is also the persistent state when `user.linkingStatus === 'PENDING'`

```typescript
// State variables to add:
const [step, setStep] = useState<'input' | 'confirm' | 'pending'>('input');
const [previewData, setPreviewData] = useState<any>(null);

// Step 1: Validate
const handleVerify = async () => {
  if (!code.trim()) return setErrorMsg('Please enter a claim code');
  setIsSubmitting(true);
  setErrorMsg(null);
  const result = await validateClaimCode(code.trim().toUpperCase());
  setIsSubmitting(false);
  if (result.success) {
    setPreviewData(result.data);
    setStep('confirm');
  } else {
    setErrorMsg(result.error || 'Invalid code');
  }
};

// Step 2: Confirm
const handleConfirm = async () => {
  setIsSubmitting(true);
  setErrorMsg(null);
  const result = await linkClaimCode(code.trim().toUpperCase());
  setIsSubmitting(false);
  if (result.success) {
    setStep('pending');
  } else {
    setErrorMsg(result.error || 'Failed to submit request');
    setStep('input'); // Go back if error
  }
};

// Show pending state immediately if user's linkingStatus is already PENDING
// (e.g. returned from the verify endpoint on app open)
useEffect(() => {
  if (user?.linkingStatus === 'PENDING') {
    setStep('pending');
  }
}, [user?.linkingStatus]);
```

**Confirmation Alert content (Step 2 UI):**
```
School:  [school.name]
Name:    [student.firstName] [student.lastName]
Class:   [student.className || "Not enrolled in a class"]
Type:    Student / Teacher
```

**Pending state UI message:**
```
⏳ Your request to join [school.name] is awaiting admin approval.
You will receive a notification once approved.
```

---

## Phase 4: Admin Panel — Pending Approvals Tab

**File:** `apps/web/src/app/[locale]/admin/claim-codes/page.tsx`

### 4.1 — Add a "Pending Approvals" Tab

Do NOT create a new page. Add a new tab inside the existing claim codes admin page.

**Tab Structure:**
```
[Overview] [Pending Approvals (N)] [All Codes] [Generate]
```

The badge `(N)` shows the count of pending requests for the current school.

### 4.2 — Add API calls to Web Client

**File:** `apps/web/src/lib/api/claimCodes.ts`

Add these methods to the `ClaimCodeService` class:

```typescript
async getPendingLinks(schoolId: string): Promise<any[]> {
  const response = await fetch(
    `${AUTH_API_URL}/auth/admin/pending-links?schoolId=${schoolId}`,
    { headers: this.getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch pending links');
  const result = await response.json();
  return result.data;
}

async approveLink(userId: string): Promise<void> {
  const response = await fetch(`${AUTH_API_URL}/auth/admin/approve-link/${userId}`, {
    method: 'POST',
    headers: this.getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to approve link');
}

async rejectLink(userId: string, reason?: string): Promise<void> {
  const response = await fetch(`${AUTH_API_URL}/auth/admin/reject-link/${userId}`, {
    method: 'POST',
    headers: this.getHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error('Failed to reject link');
}
```

> **Note:** `AUTH_API_URL` should point to the auth-service base URL, not the school-service. Check the environment variable names in the web app config.

### 4.3 — Pending Approvals Table UI

Each row in the pending approvals table shows:

| User | Email | Requested School | Type | Submitted | Actions |
|---|---|---|---|---|---|
| John Doe | john@.. | Stunity Academy | STUDENT | 2 hrs ago | ✅ Approve / ❌ Reject |

Clicking **Approve** calls `approveLink(userId)` and shows a success toast.
Clicking **Reject** opens a small modal to optionally enter a rejection reason, then calls `rejectLink(userId, reason)`.

---

## Phase 5: Verification & Testing

### 5.1 — Pre-Implementation Checklist

Before starting Phase 1, verify:
- [ ] Database is backed up or you are on a dev branch
- [ ] Auth service is running locally (`npm run dev` in `services/auth-service`)
- [ ] Mobile app can connect to local auth service

### 5.2 — Phase 1 Verification (Database)

```bash
# After migration, verify the new columns exist
npx prisma studio
# Open User model — confirm linkingStatus and pendingLinkData columns appear
```

### 5.3 — Phase 2 Verification (Backend)

Test each endpoint with curl or a REST client:

```bash
# 1. Validate endpoint (should return student/class info)
curl -X POST http://localhost:3001/auth/claim-codes/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"STNT-XXXX-YYYY"}'
# Expected: { success: true, data: { student: { className: "Grade 10A" }, school: {...} } }

# 2. Link endpoint (should now return PENDING, not full link)
curl -X POST http://localhost:3001/auth/claim-codes/link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -d '{"code":"STNT-XXXX-YYYY"}'
# Expected: { success: true, data: { linkingStatus: "PENDING" } }

# 3. Verify user — should show linkingStatus
curl http://localhost:3001/auth/verify \
  -H "Authorization: Bearer <user_token>"
# Expected: user.linkingStatus === "PENDING", user.schoolId is still null

# 4. Get pending links (admin token required)
curl http://localhost:3001/auth/admin/pending-links?schoolId=school-xxx \
  -H "Authorization: Bearer <admin_token>"
# Expected: array of pending users

# 5. Approve link
curl -X POST http://localhost:3001/auth/admin/approve-link/<userId> \
  -H "Authorization: Bearer <admin_token>"
# Expected: { success: true }

# 6. Verify user after approval
curl http://localhost:3001/auth/verify \
  -H "Authorization: Bearer <user_token>"
# Expected: user.schoolId is now set, user.role = "STUDENT"/"TEACHER", linkingStatus = "APPROVED"

# 7. Test idempotency — try linking again (should be blocked)
curl -X POST http://localhost:3001/auth/claim-codes/link \
  -H "Authorization: Bearer <user_token>" \
  -d '{"code":"STNT-XXXX-YYYY"}'
# Expected: 409 error "already linked" or "pending request exists"
```

### 5.4 — Phase 3 Verification (Mobile)

Manual test flow:

1. Open mobile app, log in with an unlinked account
2. Go to Profile → Link School Card
3. Enter a valid claim code → tap **Verify**
4. Confirm: see preview alert (Name, Class, School)
5. Tap **Confirm & Submit**
6. See "Awaiting Admin Approval" state
7. Close and reopen app → still shows "Awaiting Approval" (from `linkingStatus = PENDING` in verify response)

### 5.5 — Phase 4 Verification (Admin Panel)

1. Log in to web admin as ADMIN role
2. Navigate to `/en/admin/claim-codes`
3. See "Pending Approvals (1)" tab with badge
4. Click Approve → success toast appears
5. On mobile, pull-to-refresh Profile → account is now fully linked
6. Repeat with Reject — mobile shows notification "request rejected"

### 5.6 — Edge Case Tests

| Scenario | Expected Behaviour |
|---|---|
| User submits same code twice while PENDING | 409 error: "Pending request already exists" |
| Account already linked tries to link again | 409 error: "Account already linked" |
| Claim code expires between submit and approval | Admin sees stale entry; approval fails with "code expired" error |
| Admin rejects → user submits again | Allowed — `linkingStatus` resets to `NONE` on rejection |
| Two users submit same code | First submission wins on approval; second approval returns 409 "code already used" |
| Admin approves but student profile creation fails | Transaction rolls back; user stays PENDING; no data corruption |

---

## Summary of File Changes

| File | Change Type | Description |
|---|---|---|
| `packages/database/prisma/schema.prisma` | MODIFY | Add `linkingStatus` enum + two fields to `User` model |
| `services/auth-service/src/index.ts` | MODIFY | Update `validate` response; rewrite `link` to PENDING flow; add 3 new admin endpoints; add `linkingStatus` to verify response |
| `apps/mobile/src/stores/authStore.ts` | MODIFY | Add `validateClaimCode` action; update `linkClaimCode` for PENDING flow |
| `apps/mobile/src/screens/profile/components/LinkSchoolCard.tsx` | MODIFY | Two-step UX (Verify → Confirm → Pending) |
| `apps/web/src/lib/api/claimCodes.ts` | MODIFY | Add `getPendingLinks`, `approveLink`, `rejectLink` methods |
| `apps/web/src/app/[locale]/admin/claim-codes/page.tsx` | MODIFY | Add "Pending Approvals" tab with approve/reject UI |

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
  DB          Backend       Mobile       Web        Test
  (15 min)    (60 min)      (45 min)     (45 min)   (30 min)
```

**Always implement and verify each phase before proceeding to the next.**
