# Student Login System - Quick Start Guide

## 🚀 Quick Deployment Steps

### Step 1: Run Database Migration

When your database is accessible:

```bash
cd api
npx prisma migrate dev --name add_student_login_and_roles
```

This will create the migration and apply it to your database.

### Step 2: Update Existing Students (Optional)

If you have existing students, set default values:

```sql
-- Set all students to active by default
UPDATE students SET "isAccountActive" = true, "studentRole" = 'GENERAL';
```

### Step 3: Create Student Accounts

Use the admin API to create user accounts for existing students:

```bash
# Example: Create account for a student
curl -X POST http://localhost:5001/api/admin/students/create-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"studentId": "STUDENT_DATABASE_ID"}'
```

Or create accounts in bulk via script (see below).

### Step 4: Test Student Login

1. Go to login page
2. Click "សិស្ស" (Student) tab
3. Enter student code (e.g., `STU001`)
4. Enter password (same as student code by default)
5. Click login

### Step 5: Test Admin Features

1. Login as admin
2. Navigate to `/admin/accounts` (when UI is built)
3. Test account statistics
4. Test deactivation/activation

## 📝 Bulk Account Creation Script

Create `api/scripts/create-student-accounts.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createStudentAccounts() {
  console.log("🔄 Creating accounts for all students without accounts...");

  const studentsWithoutAccounts = await prisma.student.findMany({
    where: {
      user: null,
    },
    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
    },
  });

  console.log(`📊 Found ${studentsWithoutAccounts.length} students without accounts`);

  let created = 0;
  let failed = 0;

  for (const student of studentsWithoutAccounts) {
    try {
      const defaultPassword = student.studentId || "123456";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await prisma.user.create({
        data: {
          email: student.email || undefined,
          phone: student.phoneNumber || undefined,
          password: hashedPassword,
          firstName: student.firstName,
          lastName: student.lastName,
          role: "STUDENT",
          studentId: student.id,
        },
      });

      created++;
      console.log(`✅ Created account for: ${student.studentId} (${student.firstName} ${student.lastName})`);
    } catch (error: any) {
      failed++;
      console.error(`❌ Failed for ${student.studentId}:`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📋 Total: ${studentsWithoutAccounts.length}`);
}

createStudentAccounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run it:
```bash
cd api
npx ts-node scripts/create-student-accounts.ts
```

## 🧪 Testing Checklist

### Teacher Login
- [ ] Login with phone number
- [ ] Login with email
- [ ] Wrong password shows error
- [ ] Successful login redirects to dashboard

### Student Login
- [ ] Login with student code
- [ ] Login with email (if student has email)
- [ ] Login with phone (if student has phone)
- [ ] Wrong password shows error
- [ ] Deactivated account cannot login
- [ ] Successful login redirects to dashboard

### Admin Operations
- [ ] View account statistics
- [ ] Deactivate all students
- [ ] Deactivate by grade
- [ ] Deactivate by class
- [ ] Activate students (bulk)
- [ ] Create student account
- [ ] Reset student password
- [ ] Update student role

### Role Management
- [ ] Assign class leader (only 1 per class)
- [ ] Assign vice leader 1 (only 1 per class)
- [ ] Assign vice leader 2 (only 1 per class)
- [ ] Cannot assign duplicate leaders

## 📱 Example Use Cases

### Use Case 1: Start of School Year
```bash
# 1. Activate all students for new year
POST /api/admin/accounts/activate
{"activateAll": true}

# 2. Assign class leaders
POST /api/admin/students/update-role
{"studentId": "student-123", "studentRole": "CLASS_LEADER"}
```

### Use Case 2: Resource Conservation
```bash
# During school break, deactivate all to save resources
POST /api/admin/accounts/deactivate-all
{"reason": "School break - resource conservation"}

# Before school reopens, reactivate
POST /api/admin/accounts/activate
{"activateAll": true}
```

### Use Case 3: Grade Graduation
```bash
# Deactivate graduated students
POST /api/admin/accounts/deactivate-by-grade
{"grade": "12", "reason": "Graduated"}
```

### Use Case 4: Password Reset
```bash
# Student forgot password, admin resets to default
POST /api/admin/students/reset-password
{"studentId": "student-123"}

# Student can now login with their student code
```

## 🔐 Default Credentials

**Teachers:**
- Username: Phone number or Email
- Password: Set during account creation

**Students:**
- Username: Student Code (e.g., `STU001`)
- Password: Student Code (e.g., `STU001`) - can be changed later

**Admin:**
- Username: Email
- Password: Set during account creation

## ⚠️ Important Security Notes

1. **Change Default Passwords**: Students should change their passwords after first login
2. **Admin Access**: Keep admin credentials secure
3. **Backup**: Always backup database before bulk operations
4. **Testing**: Test deactivation on a few students before doing bulk operations

## 🆘 Troubleshooting

### "Can't reach database server"
- Check your `.env` file has correct `DATABASE_URL`
- Ensure Neon database is active (not suspended)
- Check internet connection

### "Student can't login"
- Verify account is created: Check `users` table for `studentId`
- Check account is active: `student.isAccountActive = true`
- Verify password is correct (default = student code)

### "Admin endpoints return 403"
- Ensure user has `role: "ADMIN"` in database
- Check JWT token is valid and included in request
- Verify admin middleware is working

### Migration fails
- Check no conflicting migrations
- Try `npx prisma migrate reset` (WARNING: deletes all data)
- Or manually fix migration files

## 📞 Support

For issues or questions:
1. Check `STUDENT_LOGIN_IMPLEMENTATION.md` for detailed documentation
2. Review console logs for error messages
3. Check database schema matches Prisma schema
4. Verify all API endpoints are registered in `server.ts`

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Students can login with their student codes
- ✅ Teachers can still login normally
- ✅ Admin can view account statistics
- ✅ Deactivated students cannot login
- ✅ Activated students can login again
- ✅ Class leaders are properly assigned
- ✅ No console errors in frontend/backend

## 🔄 Next Steps

After successful deployment:
1. Build admin UI for account management (Phase 6)
2. Add student role badges in student list (Phase 7)
3. Create student portal/dashboard (Phase 8)
4. Add password change functionality
5. Monitor resource usage (Neon/Render)
