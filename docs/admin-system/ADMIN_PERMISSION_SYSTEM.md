# Admin Permission System Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Permission Types](#permission-types)
5. [API Endpoints](#api-endpoints)
6. [Frontend Implementation](#frontend-implementation)
7. [How to Add New Permissions](#how-to-add-new-permissions)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Admin Permission System provides granular access control for admin users in the School Management App. It allows Super Admins to control what features and pages each admin can access.

### Key Features
- ✅ Granular permission control (13 permissions available)
- ✅ Super Admin bypass (Super Admins have all permissions)
- ✅ Real-time permission checking
- ✅ Visual permission management UI
- ✅ Sidebar menu filtering based on permissions
- ✅ Route protection with permission guards

### User Roles
1. **Super Admin** - Full access to all features, including admin management
2. **Regular Admin** - Limited access based on assigned permissions
3. **Teacher** - Standard teacher permissions (no custom permission system)
4. **Student** - Standard student permissions
5. **Parent** - Standard parent permissions

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Sidebar    │  │ Permission   │  │  Permission     │  │
│  │  Component   │──│    Guard     │──│     Hook        │  │
│  │              │  │  Component   │  │ (usePermissions)│  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│         │                 │                    │           │
│         └─────────────────┴────────────────────┘           │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │  Auth Context   │                       │
│                  │  (currentUser)  │                       │
│                  └────────┬────────┘                       │
│                           │                                │
└───────────────────────────┼────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │   API Layer       │
                  │  (API Client)     │
                  └─────────┬─────────┘
                            │
┌───────────────────────────▼────────────────────────────────┐
│                    BACKEND (Express/Prisma)                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Auth Routes  │  │ Admin Mgmt   │  │   Auth         │  │
│  │ /auth/login  │──│   Routes     │──│  Middleware    │  │
│  │ /auth/me     │  │ /admins/:id  │  │                │  │
│  └──────────────┘  └──────────────┘  └────────────────┘  │
│         │                 │                    │          │
│         └─────────────────┴────────────────────┘          │
│                           │                               │
│                  ┌────────▼────────┐                      │
│                  │  Prisma Client  │                      │
│                  └────────┬────────┘                      │
│                           │                               │
└───────────────────────────┼───────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │   Database        │
                  │   (PostgreSQL)    │
                  │   User.permissions│
                  │   User.isSuperAdmin│
                  └───────────────────┘
```

---

## Database Schema

### User Table (Relevant Fields)

```prisma
model User {
  id               String    @id @default(cuid())
  email            String?   @unique
  phone            String?   @unique
  firstName        String
  lastName         String
  role             UserRole  @default(TEACHER)
  
  // ⭐ Permission fields
  isSuperAdmin     Boolean   @default(false)
  permissions      Json?     @default("{\"canEnterGrades\": true, \"canViewReports\": true, \"canMarkAttendance\": true}")
  
  // Other fields...
  isActive         Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

enum UserRole {
  ADMIN
  TEACHER
  STUDENT
  PARENT
}
```

### Permissions JSON Structure

```json
{
  "adminPermissions": [
    "VIEW_DASHBOARD",
    "MANAGE_STUDENTS",
    "MANAGE_TEACHERS",
    "MANAGE_CLASSES",
    "MANAGE_SUBJECTS",
    "MANAGE_GRADES",
    "MANAGE_ATTENDANCE",
    "VIEW_REPORTS",
    "VIEW_AWARD_REPORT",
    "VIEW_TRACKING_BOOK",
    "VIEW_SETTINGS"
  ]
}
```

**Note:** Super Admins don't need permissions in the database - they bypass all permission checks.

---

## Permission Types

### Complete Permission List

| Permission Key | Label (English) | Label (Khmer) | Description | UI Component |
|---------------|-----------------|---------------|-------------|--------------|
| `VIEW_DASHBOARD` | View Dashboard | មើលផ្ទាំងគ្រប់គ្រង | Access main dashboard and statistics | Dashboard page |
| `MANAGE_STUDENTS` | Manage Students | គ្រប់គ្រងសិស្ស | Create, edit, delete students | Students section |
| `MANAGE_TEACHERS` | Manage Teachers | គ្រប់គ្រងគ្រូបង្រៀន | Create, edit, delete teachers | Teachers section |
| `MANAGE_CLASSES` | Manage Classes | គ្រប់គ្រងថ្នាក់រៀន | Create, edit, delete classes | Classes section |
| `MANAGE_SUBJECTS` | Manage Subjects | គ្រប់គ្រងមុខវិជ្ជា | Create, edit, delete subjects | Subjects section |
| `MANAGE_GRADES` | Manage Grades | គ្រប់គ្រងពិន្ទុ | Enter and modify student scores | Grade Entry section |
| `MANAGE_ATTENDANCE` | Manage Attendance | គ្រប់គ្រងវត្តមាន | Mark and manage attendance | Attendance section |
| `VIEW_REPORTS` | View Reports | មើលរបាយការណ៍ | Access monthly and statistical reports | Reports section |
| `VIEW_AWARD_REPORT` | View Award Reports | មើលតារាងកិត្តិយស | Access honor roll and awards | Award Report |
| `VIEW_TRACKING_BOOK` | View Tracking Book | មើលសៀវភៅតាមដាន | Access student tracking books | Tracking Book |
| `VIEW_SETTINGS` | Access Settings | ចូលប្រើការកំណត់ | Access system settings | Settings page |
| `MANAGE_ADMINS` | Manage Admins | គ្រប់គ្រងអ្នកគ្រប់គ្រង | Manage admin accounts (Super Admin only) | Admin Management |

### Permission Categories

Permissions are organized into 8 categories for better UI organization:

1. **Dashboard & Overview** (📊)
2. **Student Management** (👥)
3. **Teacher Management** (👨‍🏫)
4. **Academic Management** (🎓) - Classes & Subjects
5. **Grades & Scores** (📝)
6. **Attendance Management** (📅)
7. **Reports & Statistics** (📊)
8. **System Settings** (⚙️)

---

## API Endpoints

### 1. Get Admin Permissions

**Endpoint:** `GET /api/admins/:adminId/permissions`

**Description:** Fetch permissions for a specific admin user

**Authentication:** Required (Super Admin only)

**Request:**
```bash
GET /api/admins/clx1234567890/permissions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "adminId": "clx1234567890",
    "adminName": "Mongkol Admin",
    "isSuperAdmin": false,
    "permissions": [
      "VIEW_DASHBOARD",
      "MANAGE_TEACHERS",
      "MANAGE_CLASSES",
      "MANAGE_SUBJECTS",
      "MANAGE_GRADES",
      "MANAGE_ATTENDANCE",
      "VIEW_REPORTS",
      "VIEW_AWARD_REPORT",
      "VIEW_TRACKING_BOOK"
    ]
  }
}
```

---

### 2. Update Admin Permissions

**Endpoint:** `PUT /api/admins/:adminId/permissions`

**Description:** Update permissions for a specific admin user

**Authentication:** Required (Super Admin only)

**Request:**
```bash
PUT /api/admins/clx1234567890/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissions": [
    "VIEW_DASHBOARD",
    "MANAGE_STUDENTS",
    "VIEW_REPORTS"
  ]
}
```

**Response:**
```json
{
  "data": {
    "adminId": "clx1234567890",
    "message": "Permissions updated successfully",
    "updatedPermissions": [
      "VIEW_DASHBOARD",
      "MANAGE_STUDENTS",
      "VIEW_REPORTS"
    ]
  }
}
```

**Error Responses:**

- `400` - Invalid permissions array
- `403` - Not authorized (only Super Admin can modify)
- `403` - Cannot modify Super Admin permissions
- `404` - Admin not found

---

### 3. Login with Permissions

**Endpoint:** `POST /api/auth/login`

**Description:** Login returns user data including permissions

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "admin@school.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ចូលប្រើប្រាស់បានជោគជ័យ\nLogin successful",
  "data": {
    "user": {
      "id": "clx1234567890",
      "email": "admin@school.com",
      "firstName": "Mongkol",
      "lastName": "Admin",
      "role": "ADMIN",
      "isSuperAdmin": false,
      "permissions": {
        "adminPermissions": [
          "VIEW_DASHBOARD",
          "MANAGE_STUDENTS",
          "VIEW_REPORTS"
        ]
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "365d"
  }
}
```

---

### 4. Get Current User

**Endpoint:** `GET /api/auth/me`

**Description:** Get current logged-in user data including permissions

**Authentication:** Required

**Request:**
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "email": "admin@school.com",
    "firstName": "Mongkol",
    "lastName": "Admin",
    "role": "ADMIN",
    "isSuperAdmin": false,
    "permissions": {
      "adminPermissions": [
        "VIEW_DASHBOARD",
        "MANAGE_STUDENTS",
        "VIEW_REPORTS"
      ]
    },
    "isActive": true,
    "lastLogin": "2026-01-23T17:30:00.000Z"
  }
}
```

---

## Frontend Implementation

### 1. Permission Definitions (`src/lib/permissions.ts`)

```typescript
// Define all permissions as constants
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  MANAGE_STUDENTS: 'MANAGE_STUDENTS',
  MANAGE_TEACHERS: 'MANAGE_TEACHERS',
  // ... other permissions
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Helper functions
export const hasPermission = (
  userPermissions: Permission[] | null | undefined,
  requiredPermission: Permission
): boolean => {
  if (!userPermissions) return false;
  return userPermissions.includes(requiredPermission);
};
```

---

### 2. usePermissions Hook (`src/hooks/usePermissions.ts`)

The custom hook provides easy permission checking in any component:

```typescript
import { useAuth } from "@/context/AuthContext";
import { Permission, hasPermission } from "@/lib/permissions";

export function usePermissions() {
  const { currentUser } = useAuth();
  
  // Extract permissions from user object
  const userPermissions = currentUser?.permissions?.adminPermissions || [];
  const isSuperAdmin = currentUser?.isSuperAdmin || false;
  
  // Super Admins bypass all checks
  const checkPermission = (permission: Permission): boolean => {
    if (isSuperAdmin) return true;
    return hasPermission(userPermissions, permission);
  };
  
  return {
    permissions: userPermissions,
    isSuperAdmin,
    hasPermission: checkPermission,
    hasAnyPermission: (perms: Permission[]) => { /* ... */ },
    hasAllPermissions: (perms: Permission[]) => { /* ... */ },
  };
}
```

**Usage in Components:**

```typescript
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";

function MyComponent() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  
  if (!hasPermission(PERMISSIONS.MANAGE_STUDENTS)) {
    return <div>Access Denied</div>;
  }
  
  return <div>Student Management</div>;
}
```

---

### 3. Sidebar Menu Filtering (`src/components/layout/Sidebar.tsx`)

The sidebar automatically hides menu items based on permissions:

```typescript
const menuItems = [
  {
    icon: LayoutDashboard,
    label: "ផ្ទាំងគ្រប់គ្រង",
    href: "/",
    roles: ["ADMIN"],
    permission: PERMISSIONS.VIEW_DASHBOARD,
  },
  {
    icon: Users,
    label: "សិស្ស",
    href: "/students",
    roles: ["ADMIN"],
    permission: PERMISSIONS.MANAGE_STUDENTS,
  },
  // ... other menu items
];

// Filter based on permissions
const filteredMenuItems = menuItems.filter((item) => {
  // Check role
  if (!item.roles.includes(userRole || "")) return false;
  
  // Super Admins see everything
  if (isSuperAdmin) return true;
  
  // Check specific permission
  if (item.permission) {
    return hasPermission(item.permission);
  }
  
  return true;
});
```

---

### 4. Permission Modal (`src/components/admin/modals/PermissionModal.tsx`)

Visual UI for managing admin permissions:

**Features:**
- ✅ View current permissions
- ✅ Toggle permissions on/off
- ✅ Categorized permission groups
- ✅ Super Admin protection (cannot modify)
- ✅ Real-time permission count
- ✅ Bilingual labels (English/Khmer)

**Usage:**

```typescript
<PermissionModal
  adminId="clx1234567890"
  adminName="Mongkol Admin"
  isSuperAdmin={false}
  onClose={() => setShowModal(false)}
  onSuccess={() => {
    // Refresh admin list
    loadAdmins();
  }}
/>
```

---

### 5. Auth Context Integration (`src/context/AuthContext.tsx`)

The Auth Context stores and provides user permissions throughout the app:

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  isSuperAdmin: boolean;
  permissions: {
    adminPermissions: string[];
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Login fetches user with permissions
  const login = async (credentials) => {
    const result = await authApi.login(credentials);
    setCurrentUser(result.user); // Includes permissions
    localStorage.setItem("user", JSON.stringify(result.user));
  };
  
  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## How to Add New Permissions

### Step 1: Define Permission in Constants

**File:** `src/lib/permissions.ts`

```typescript
export const PERMISSIONS = {
  // ... existing permissions
  
  // ⭐ Add new permission
  MANAGE_EVENTS: 'MANAGE_EVENTS',
} as const;
```

### Step 2: Add to Permission Categories

**File:** `src/lib/permissions.ts`

```typescript
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  // ... existing categories
  
  {
    id: 'events',
    label: 'Event Management',
    labelKhmer: 'គ្រប់គ្រងព្រឹត្តិការណ៍',
    icon: '🎉',
    permissions: [
      {
        key: PERMISSIONS.MANAGE_EVENTS,
        label: 'Manage Events',
        labelKhmer: 'គ្រប់គ្រងព្រឹត្តិការណ៍',
        description: 'Create and manage school events',
      },
    ],
  },
];
```

### Step 3: Add Menu Item to Sidebar

**File:** `src/components/layout/Sidebar.tsx`

```typescript
const menuItems = [
  // ... existing menu items
  
  {
    icon: Calendar,
    label: "ព្រឹត្តិការណ៍",
    href: "/events",
    roles: ["ADMIN"],
    permission: PERMISSIONS.MANAGE_EVENTS,
    gradient: "from-purple-500 to-pink-500",
  },
];
```

### Step 4: Protect Route/Component

**Option A: Using usePermissions Hook**

```typescript
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";

export default function EventsPage() {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(PERMISSIONS.MANAGE_EVENTS)) {
    return <AccessDenied />;
  }
  
  return <EventManagementUI />;
}
```

**Option B: Using PermissionGuard Component**

```typescript
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@/lib/permissions";

export default function EventsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.MANAGE_EVENTS}>
      <EventManagementUI />
    </PermissionGuard>
  );
}
```

### Step 5: Update Documentation

Update this document with the new permission details.

### Step 6: Test

1. ✅ Test as Super Admin (should have access automatically)
2. ✅ Test as regular admin WITHOUT the permission (should be blocked)
3. ✅ Test as regular admin WITH the permission (should have access)
4. ✅ Verify sidebar shows/hides the menu item correctly
5. ✅ Verify permission modal displays the new permission

---

## Security Considerations

### 1. Frontend Security

⚠️ **Important:** Frontend permission checks are for UX only, NOT security.

```typescript
// ❌ BAD: Relying only on frontend checks
if (hasPermission(PERMISSIONS.DELETE_STUDENT)) {
  await deleteStudent(id); // No backend verification
}

// ✅ GOOD: Backend also verifies permissions
if (hasPermission(PERMISSIONS.DELETE_STUDENT)) {
  // Backend will verify permission again
  await deleteStudent(id);
}
```

### 2. Backend Security

**Always verify permissions on the backend:**

```typescript
// api/src/middleware/permission.middleware.ts
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isSuperAdmin: true, permissions: true }
    });
    
    // Super Admin bypass
    if (user?.isSuperAdmin) {
      return next();
    }
    
    // Check permission
    const userPermissions = user?.permissions?.adminPermissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ error: "Permission denied" });
    }
    
    next();
  };
};

// Usage in routes
router.delete('/students/:id', 
  authMiddleware,
  requirePermission(PERMISSIONS.MANAGE_STUDENTS),
  deleteStudent
);
```

### 3. Super Admin Protection

```typescript
// ❌ NEVER allow modifying Super Admin permissions
if (targetAdmin.isSuperAdmin) {
  return res.status(403).json({
    error: "Cannot modify Super Admin permissions"
  });
}
```

### 4. Token Security

- ✅ Permissions are stored in database, not JWT token
- ✅ Permissions are fetched fresh on each `/auth/me` call
- ✅ LocalStorage user cache is updated after permission changes
- ✅ Users must re-login to see permission updates (or implement real-time sync)

---

## Troubleshooting

### Issue 1: Sidebar Shows Empty / No Menu Items

**Symptoms:**
- User logs in successfully
- Dashboard loads
- Sidebar is empty or shows "មិនមានម៉ឺនុយ" (No menus)
- Console shows: `userPermissions: Array(0)`

**Root Cause:**
API not returning `permissions` and `isSuperAdmin` fields

**Solution:**
Verify `auth.controller.ts` includes these fields:

```typescript
// login endpoint
res.json({
  user: {
    id: user.id,
    // ... other fields
    isSuperAdmin: user.isSuperAdmin, // ← Must include
    permissions: user.permissions,     // ← Must include
  }
});

// getCurrentUser endpoint
select: {
  id: true,
  // ... other fields
  isSuperAdmin: true,  // ← Must include
  permissions: true,   // ← Must include
}
```

**Verification:**
```bash
# Check login response
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@school.com","password":"pass"}' \
  | jq '.data.user.permissions'

# Check getCurrentUser response
curl http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer <token>" \
  | jq '.data.permissions'
```

---

### Issue 2: Permission Changes Not Reflecting

**Symptoms:**
- Super Admin updates permissions
- Admin user still sees old permissions

**Cause:**
LocalStorage cached user data

**Solution:**
User must logout and login again, OR implement real-time sync:

```typescript
// Option 1: Force logout after permission update (Simple)
onPermissionUpdate() {
  showNotification("Permissions updated. Please login again.");
  logout();
}

// Option 2: Real-time sync (Advanced)
useEffect(() => {
  const interval = setInterval(async () => {
    const freshUser = await authApi.getCurrentUser();
    if (JSON.stringify(freshUser.permissions) !== 
        JSON.stringify(currentUser?.permissions)) {
      setCurrentUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));
      showNotification("Your permissions have been updated");
    }
  }, 30000); // Check every 30 seconds
  
  return () => clearInterval(interval);
}, [currentUser]);
```

---

### Issue 3: Super Admin Cannot Access Settings

**Symptoms:**
- User is Super Admin (`isSuperAdmin: true`)
- Settings menu not showing

**Cause:**
Permission check not bypassing for Super Admin

**Solution:**
Verify `usePermissions` hook:

```typescript
const checkPermission = (permission: Permission): boolean => {
  // ⭐ Super Admin must bypass first
  if (isSuperAdmin) return true;
  
  return hasPermission(userPermissions, permission);
};
```

---

### Issue 4: Permission Modal Shows "Access Denied"

**Symptoms:**
- Click "Manage Permissions" button
- See "Access Denied" error

**Cause:**
Requesting user is not Super Admin

**Solution:**
Only Super Admins can manage permissions:

```typescript
// In admin list component
{currentUser.isSuperAdmin && (
  <button onClick={() => openPermissionModal(admin)}>
    Manage Permissions
  </button>
)}
```

---

### Issue 5: Database Permissions Not Saving

**Symptoms:**
- Click "Save Permissions"
- Success message shows
- Refresh page - permissions are empty again

**Cause:**
JSON field not being properly updated in Prisma

**Solution:**
Use proper JSON update syntax:

```typescript
// ❌ WRONG
await prisma.user.update({
  where: { id: adminId },
  data: {
    permissions: { adminPermissions: permissions }
  }
});

// ✅ CORRECT
await prisma.user.update({
  where: { id: adminId },
  data: {
    permissions: {
      ...currentPermissions,
      adminPermissions: permissions,
    }
  }
});
```

---

### Debugging Tips

**1. Check Console Logs**

The system has extensive logging:

```javascript
// Look for these logs in browser console:
🔍 [usePermissions] Hook called: {
  currentUser: "admin@school.com",
  role: "ADMIN",
  isSuperAdmin: false,
  permissionsObject: { adminPermissions: [...] },
  permissionCount: 9
}

🔍 [SIDEBAR] ផ្ទាំងគ្រប់គ្រង: Permission VIEW_DASHBOARD = true
```

**2. Inspect API Responses**

Use browser DevTools Network tab:
- Check `/api/auth/login` response
- Check `/api/auth/me` response
- Verify `permissions` field exists and is an object

**3. Check Database Directly**

```sql
-- Check admin permissions in database
SELECT 
  id, 
  "firstName", 
  "lastName", 
  "isSuperAdmin", 
  permissions 
FROM "User" 
WHERE role = 'ADMIN' 
  AND "firstName" = 'Mongkol';
```

**4. Test API Endpoints**

```bash
# Test get permissions
curl http://localhost:5001/api/admins/clx1234567890/permissions \
  -H "Authorization: Bearer <super_admin_token>"

# Test update permissions
curl -X PUT http://localhost:5001/api/admins/clx1234567890/permissions \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"permissions":["VIEW_DASHBOARD","MANAGE_STUDENTS"]}'
```

---

## Summary Checklist

When implementing or debugging the permission system:

### Backend Checklist
- [ ] `User.permissions` field exists in database (JSON type)
- [ ] `User.isSuperAdmin` field exists in database (Boolean)
- [ ] Login endpoint returns `isSuperAdmin` and `permissions`
- [ ] `/auth/me` endpoint selects `isSuperAdmin` and `permissions`
- [ ] Update permission endpoint validates Super Admin
- [ ] Update permission endpoint prevents modifying Super Admin permissions
- [ ] Backend routes verify permissions with middleware (for security)

### Frontend Checklist
- [ ] `PERMISSIONS` constants defined in `src/lib/permissions.ts`
- [ ] `PERMISSION_CATEGORIES` includes all permissions with labels
- [ ] `usePermissions` hook extracts permissions from `currentUser`
- [ ] `usePermissions` hook bypasses checks for Super Admin
- [ ] Sidebar menu items have `permission` property
- [ ] Sidebar filters menu items based on permissions
- [ ] Protected pages use `usePermissions` hook or `PermissionGuard`
- [ ] Permission modal can toggle permissions on/off
- [ ] Permission modal prevents modifying Super Admin

### Testing Checklist
- [ ] Super Admin sees all menus
- [ ] Regular admin with no permissions sees "No menus"
- [ ] Regular admin with 1 permission sees only that menu
- [ ] Permission changes require logout/login to take effect
- [ ] Cannot modify Super Admin permissions via modal
- [ ] API returns 403 when non-Super Admin tries to modify permissions

---

## Related Files

### Frontend Files
```
src/
├── lib/
│   └── permissions.ts                    # Permission constants and helpers
├── hooks/
│   └── usePermissions.ts                 # Permission checking hook
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx                   # Menu filtering by permissions
│   ├── admin/
│   │   └── modals/
│   │       └── PermissionModal.tsx       # Permission management UI
│   └── PermissionGuard.tsx               # Route protection component
├── context/
│   └── AuthContext.tsx                   # User state with permissions
└── app/
    ├── settings/
    │   └── page.tsx                      # Admin account management
    └── (auth)/
        └── login/
            └── page.tsx                  # Login with permission loading
```

### Backend Files
```
api/src/
├── controllers/
│   ├── auth.controller.ts                # Login & getCurrentUser with permissions
│   └── admin-management.controller.ts    # Permission CRUD operations
├── routes/
│   ├── auth.routes.ts                    # Auth endpoints
│   └── admin-management.routes.ts        # Admin management endpoints
├── middleware/
│   └── auth.middleware.ts                # JWT verification
└── prisma/
    └── schema.prisma                     # Database schema
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-01-23 | Initial documentation | System |
| 1.0.1 | 2026-01-23 | Fixed permissions not loading issue | System |

---

## Questions or Issues?

If you encounter issues not covered in this documentation:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review console logs for error messages
3. Verify API responses in Network tab
4. Check database directly if needed
5. Review the code examples above

For new feature requests or permission system enhancements, update this documentation accordingly.

---

**Last Updated:** 2026-01-23
**System Version:** v1.0.1
