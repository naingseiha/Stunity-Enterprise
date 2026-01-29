# Admin Permission System - Quick Reference

## 🚀 Quick Start

### Check if User Has Permission

```typescript
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";

function MyComponent() {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(PERMISSIONS.MANAGE_STUDENTS)) {
    return <div>Access Denied</div>;
  }
  
  return <div>Student Management</div>;
}
```

### Protect a Route

```typescript
import { PermissionGuard } from "@/components/PermissionGuard";
import { PERMISSIONS } from "@/lib/permissions";

export default function StudentsPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.MANAGE_STUDENTS}>
      <StudentManagementUI />
    </PermissionGuard>
  );
}
```

### Add Menu Item with Permission

```typescript
// src/components/layout/Sidebar.tsx
const menuItems = [
  {
    icon: Users,
    label: "សិស្ស",
    href: "/students",
    roles: ["ADMIN"],
    permission: PERMISSIONS.MANAGE_STUDENTS, // ← Add this
    gradient: "from-purple-500 to-pink-500",
  },
];
```

---

## 📋 All Available Permissions

| Permission | What it Controls |
|------------|------------------|
| `VIEW_DASHBOARD` | Dashboard page access |
| `MANAGE_STUDENTS` | Students section (CRUD) |
| `MANAGE_TEACHERS` | Teachers section (CRUD) |
| `MANAGE_CLASSES` | Classes section (CRUD) |
| `MANAGE_SUBJECTS` | Subjects section (CRUD) |
| `MANAGE_GRADES` | Grade entry and modification |
| `MANAGE_ATTENDANCE` | Attendance marking |
| `VIEW_REPORTS` | Monthly reports access |
| `VIEW_AWARD_REPORT` | Award/honor roll reports |
| `VIEW_TRACKING_BOOK` | Student tracking books |
| `VIEW_SETTINGS` | Settings page access |
| `MANAGE_ADMINS` | Admin management (Super Admin only) |

---

## 🔧 Common Tasks

### 1. How to Add a New Permission

**Step 1:** Add to `src/lib/permissions.ts`
```typescript
export const PERMISSIONS = {
  // ... existing
  NEW_PERMISSION: 'NEW_PERMISSION',
} as const;
```

**Step 2:** Add to categories
```typescript
export const PERMISSION_CATEGORIES = [
  {
    id: 'new-category',
    label: 'New Category',
    labelKhmer: 'ប្រភេទថ្មី',
    icon: '🆕',
    permissions: [
      {
        key: PERMISSIONS.NEW_PERMISSION,
        label: 'New Permission',
        labelKhmer: 'សិទ្ធិថ្មី',
        description: 'Description here',
      },
    ],
  },
];
```

**Step 3:** Use in component
```typescript
const { hasPermission } = usePermissions();

if (hasPermission(PERMISSIONS.NEW_PERMISSION)) {
  // Show feature
}
```

### 2. How to Give Admin Permissions

**Via UI:**
1. Login as Super Admin
2. Go to Settings → Admin Accounts
3. Click "Manage Permissions" on admin row
4. Toggle permissions on/off
5. Click "Save Permissions"

**Via API:**
```bash
curl -X PUT http://localhost:5001/api/admins/{adminId}/permissions \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "VIEW_DASHBOARD",
      "MANAGE_STUDENTS",
      "VIEW_REPORTS"
    ]
  }'
```

### 3. How to Make Someone Super Admin

**Via Database:**
```sql
UPDATE "User" 
SET "isSuperAdmin" = true 
WHERE email = 'admin@school.com';
```

**Note:** Super Admins bypass ALL permission checks and have access to everything.

### 4. How to Check Permissions in Console

```javascript
// In browser console after login
const user = JSON.parse(localStorage.getItem('user'));
console.log('Super Admin:', user.isSuperAdmin);
console.log('Permissions:', user.permissions.adminPermissions);
```

---

## 🐛 Quick Troubleshooting

### Sidebar Empty After Login?

**Check:**
```typescript
// Console should show:
🔍 [usePermissions] Hook called: {
  currentUser: "admin@school.com",
  permissionCount: 9  // ← Should NOT be 0
}
```

**Fix:** API must return `permissions` and `isSuperAdmin`:
```typescript
// api/src/controllers/auth.controller.ts
select: {
  id: true,
  // ...
  isSuperAdmin: true,  // ← Add these
  permissions: true,   // ← Add these
}
```

### Permission Changes Not Working?

**Solution:** User must logout and login again.

**Why?** Permissions are cached in localStorage.

### "Access Denied" When Managing Permissions?

**Reason:** Only Super Admins can manage permissions.

**Check:**
```sql
SELECT "isSuperAdmin" FROM "User" WHERE id = 'your-user-id';
```

---

## 📊 Permission Data Structure

### In Database
```json
{
  "adminPermissions": [
    "VIEW_DASHBOARD",
    "MANAGE_STUDENTS",
    "VIEW_REPORTS"
  ]
}
```

### In Frontend (currentUser object)
```typescript
{
  id: "clx123",
  email: "admin@school.com",
  role: "ADMIN",
  isSuperAdmin: false,
  permissions: {
    adminPermissions: [
      "VIEW_DASHBOARD",
      "MANAGE_STUDENTS",
      "VIEW_REPORTS"
    ]
  }
}
```

---

## 🔐 Security Rules

1. ✅ **Super Admin** = Bypass all checks, see everything
2. ✅ **Regular Admin** = Only see/access granted permissions
3. ✅ **Cannot modify Super Admin** = Protection against accidents
4. ✅ **Frontend checks** = UX only (hide menus)
5. ✅ **Backend checks** = Real security (verify every request)

---

## 🎯 usePermissions Hook API

```typescript
const {
  permissions,          // Array of permission strings
  isSuperAdmin,         // Boolean
  hasPermission,        // (perm: Permission) => boolean
  hasAnyPermission,     // (perms: Permission[]) => boolean
  hasAllPermissions,    // (perms: Permission[]) => boolean
} = usePermissions();
```

**Examples:**
```typescript
// Check single permission
if (hasPermission(PERMISSIONS.MANAGE_STUDENTS)) { }

// Check if has ANY of these
if (hasAnyPermission([
  PERMISSIONS.MANAGE_STUDENTS,
  PERMISSIONS.VIEW_REPORTS
])) { }

// Check if has ALL of these
if (hasAllPermissions([
  PERMISSIONS.VIEW_DASHBOARD,
  PERMISSIONS.MANAGE_STUDENTS
])) { }

// Check if Super Admin
if (isSuperAdmin) { }
```

---

## 📱 API Quick Reference

### Get Permissions
```bash
GET /api/admins/:adminId/permissions
Authorization: Bearer <token>
```

### Update Permissions
```bash
PUT /api/admins/:adminId/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissions": ["VIEW_DASHBOARD", "MANAGE_STUDENTS"]
}
```

### Login (returns permissions)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "admin@school.com",
  "password": "password"
}
```

### Get Current User (includes permissions)
```bash
GET /api/auth/me
Authorization: Bearer <token>
```

---

## 💡 Tips & Best Practices

1. **Always use PERMISSIONS constants** - Never hardcode strings
   ```typescript
   // ❌ BAD
   if (hasPermission('MANAGE_STUDENTS')) { }
   
   // ✅ GOOD
   if (hasPermission(PERMISSIONS.MANAGE_STUDENTS)) { }
   ```

2. **Super Admin check first** - Always bypass for Super Admin
   ```typescript
   if (isSuperAdmin) return true;
   return hasPermission(permission);
   ```

3. **Frontend + Backend** - Check permissions in both places
   ```typescript
   // Frontend (UX)
   if (!hasPermission(PERMISSIONS.DELETE)) {
     return <div>Access Denied</div>;
   }
   
   // Backend (Security)
   router.delete('/students/:id',
     requirePermission(PERMISSIONS.DELETE),
     deleteStudent
   );
   ```

4. **Document new permissions** - Update this guide when adding new ones

5. **Test all scenarios** - Test as Super Admin, with permission, without permission

---

## 🔗 Related Documentation

- [Full Documentation](./ADMIN_PERMISSION_SYSTEM.md) - Complete guide with architecture details
- [API Documentation](./API.md) - Full API endpoint reference
- [Security Guide](./SECURITY.md) - Security best practices

---

**Last Updated:** 2026-01-23
