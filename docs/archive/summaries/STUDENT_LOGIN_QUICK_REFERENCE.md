# 🚀 Student Login System - Quick Reference

## 📋 Common Operations

### 1️⃣ Run Migration
```bash
cd api
npx prisma migrate dev --name add_student_login_and_roles
```

### 2️⃣ Create Bulk Student Accounts
```bash
cd api
npx ts-node scripts/create-student-accounts.ts
```

### 3️⃣ Test Student Login
**URL:** http://localhost:3000/login
1. Click "សិស្ស" (Student) tab
2. Enter: `STU001` (or any student code)
3. Password: `STU001` (same as student code)

### 4️⃣ Get Statistics
```bash
curl -X GET http://localhost:5001/api/admin/accounts/statistics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 5️⃣ Deactivate All Students
```bash
curl -X POST http://localhost:5001/api/admin/accounts/deactivate-all \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "School break"}'
```

### 6️⃣ Activate All Students
```bash
curl -X POST http://localhost:5001/api/admin/accounts/activate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"activateAll": true}'
```

### 7️⃣ Reset Student Password
```bash
curl -X POST http://localhost:5001/api/admin/students/reset-password \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "STUDENT_DATABASE_ID"}'
```

### 8️⃣ Assign Class Leader
```bash
curl -X POST http://localhost:5001/api/admin/students/update-role \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "STUDENT_ID", "studentRole": "CLASS_LEADER"}'
```

---

## 🔑 Student Roles

| Role | Khmer | Max per Class |
|------|-------|---------------|
| `GENERAL` | សិស្សធម្មតា | Unlimited |
| `CLASS_LEADER` | ប្រធានថ្នាក់ | 1 |
| `VICE_LEADER_1` | អនុប្រធានទី១ | 1 |
| `VICE_LEADER_2` | អនុប្រធានទី២ | 1 |

---

## 🎯 Login Methods

### Teacher Login
- Phone: `012345678`
- Email: `teacher@school.com`

### Student Login
- Student Code: `STU001`
- Email: `student@email.com` (if set)
- Phone: `098765432` (if set)

### Default Passwords
- Teachers: Set during account creation
- Students: **Same as student code**

---

## 📊 Quick Status Check

```typescript
// Check if student has account
const student = await prisma.student.findUnique({
  where: { id: "..." },
  include: { user: true }
});
console.log("Has account:", !!student.user);
console.log("Is active:", student.isAccountActive);
```

---

## ⚡ Emergency Commands

### Activate Everything
```bash
# If you accidentally deactivated all students
curl -X POST http://localhost:5001/api/admin/accounts/activate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"activateAll": true}'
```

### Check What Happened
```bash
# View statistics
curl http://localhost:5001/api/admin/accounts/statistics \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔧 Troubleshooting

### "Can't reach database"
```bash
# Check .env file
cat api/.env | grep DATABASE_URL
```

### "Student can't login"
```sql
-- Check if account exists
SELECT * FROM users WHERE "studentId" = 'STUDENT_DB_ID';

-- Check if active
SELECT "isAccountActive" FROM students WHERE "studentId" = 'STU001';
```

### "Admin endpoints return 403"
```sql
-- Check user role
SELECT role FROM users WHERE email = 'admin@school.com';
-- Should be: ADMIN
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `api/prisma/schema.prisma` | Database schema |
| `api/src/controllers/auth.controller.ts` | Login logic |
| `api/src/controllers/admin.controller.ts` | Admin operations |
| `src/app/(auth)/login/page.tsx` | Login UI |
| `api/scripts/create-student-accounts.ts` | Bulk creation |

---

## 🆘 Get Admin Token

### 1. Login as Admin
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@school.com", "password": "your_password"}'
```

### 2. Copy Token from Response
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Use Token
```bash
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X GET http://localhost:5001/api/admin/accounts/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 📈 Usage Examples

### Scenario 1: New School Year
```bash
# 1. Activate all students
POST /api/admin/accounts/activate {"activateAll": true}

# 2. Create accounts for new students
ts-node scripts/create-student-accounts.ts

# 3. Assign class leaders
POST /api/admin/students/update-role 
{"studentId": "xxx", "studentRole": "CLASS_LEADER"}
```

### Scenario 2: School Break
```bash
# 1. Deactivate all students
POST /api/admin/accounts/deactivate-all 
{"reason": "School break - save resources"}

# 2. Check statistics
GET /api/admin/accounts/statistics

# 3. When school reopens, activate
POST /api/admin/accounts/activate {"activateAll": true}
```

### Scenario 3: Graduation
```bash
# 1. Deactivate Grade 12
POST /api/admin/accounts/deactivate-by-grade 
{"grade": "12", "reason": "Graduated"}

# 2. Verify statistics
GET /api/admin/accounts/statistics
```

---

## ⚙️ Environment Variables

```bash
# api/.env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="365d"
```

---

## 🎓 Next Steps

1. ✅ Run migration
2. ✅ Create student accounts
3. ✅ Test student login
4. ✅ Test admin APIs
5. 🔲 Build admin UI
6. 🔲 Add role badges
7. 🔲 Create student portal

---

## 📞 Documentation

- 📄 `STUDENT_LOGIN_IMPLEMENTATION.md` - Full API docs
- 📄 `STUDENT_LOGIN_QUICKSTART.md` - Step-by-step guide
- 📄 `STUDENT_LOGIN_COMPLETE_SUMMARY.md` - Overview
- 📄 `STUDENT_LOGIN_QUICK_REFERENCE.md` - This file

---

**Last Updated:** January 11, 2026  
**Status:** ✅ Ready for Migration & Testing
