# Parent Portal Testing Guide - Quick Start

## 🎯 Two Ways to Get Parent Accounts

### Option 1: **Automatic Migration** (Recommended for First Time)

This converts all existing student parent data into parent accounts automatically.

#### Step 1: Run Migration Script

```bash
cd api
npx ts-node scripts/migrate-parent-data.ts
```

**What it does:**
- ✅ Reads all students with parent info (fatherName, motherName, parentPhone)
- ✅ Creates unique Parent records (grouped by phone number)
- ✅ Creates User accounts for each parent (password = phone number)
- ✅ Links parents to their children via StudentParent table
- ✅ Handles duplicates and edge cases
- ✅ Shows detailed progress and summary

**Example Output:**
```
🚀 Starting Parent Data Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Step 1: Fetching all students...
✅ Found 150 students with parent data

📊 Step 2: Extracting unique parents...
✅ Identified 120 unique parents

📊 Step 3: Creating parent records and user accounts...
✅ Created parent: សុខ វិចិត្រា (012345678)
  ✅ Created user account (password: 012345678)
  ✅ Linked to student ID: cmiq7...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 MIGRATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Parents created:       120
✅ User accounts created: 120
✅ Student links created: 150
❌ Errors encountered:    0

✅ Migration completed successfully!
```

#### Step 2: Get a Parent Phone Number

After migration, find a parent phone number:

```bash
# Get admin token first
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.edu.kh",
    "password": "admin123"
  }' | jq -r '.data.token'

export ADMIN_TOKEN="YOUR_TOKEN"

# Get list of parents with their phone numbers
curl http://localhost:5001/api/admin/parents \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data.parents[0:5] | .[] | {khmerName, phone, studentCount: (.studentParents | length)}'
```

#### Step 3: Test Parent Login

```bash
# Login as parent (password is the same as phone number)
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "PARENT_PHONE_FROM_STEP_2",
    "password": "PARENT_PHONE_FROM_STEP_2"
  }' | jq

# Save the token
export PARENT_TOKEN="TOKEN_FROM_RESPONSE"
```

#### Step 4: Test Parent Portal API

```bash
# Get parent profile
curl http://localhost:5001/api/parent-portal/profile \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq

# Get children with stats
curl http://localhost:5001/api/parent-portal/children \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq
```

#### Step 5: Test Parent Portal UI

1. Open browser: `http://localhost:3000/login`
2. Login with:
   - Phone: (parent phone from step 2)
   - Password: (same as phone)
3. Should redirect to: `http://localhost:3000/parent-portal`
4. Explore all tabs:
   - ✅ Dashboard: See all children
   - ✅ Children: Select child, load grades/attendance
   - ✅ Profile: View info, change password
   - ✅ Notifications: Coming soon message

---

### Option 2: **Manual Creation** (For New Parents After Migration)

Use this for creating new parent accounts after the initial migration.

#### Via API (Admin)

```bash
# 1. Get admin token
export ADMIN_TOKEN="YOUR_ADMIN_TOKEN"

# 2. Create parent record
curl -X POST http://localhost:5001/api/admin/parents/create \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sok",
    "lastName": "Pisey",
    "khmerName": "សុខ ពិសី",
    "phone": "012999888",
    "email": "parent@example.com",
    "relationship": "MOTHER",
    "occupation": "គ្រូបង្រៀន"
  }' | jq

# Save parent ID from response
export PARENT_ID="PARENT_ID_FROM_RESPONSE"

# 3. Create user account for parent
curl -X POST http://localhost:5001/api/admin/parents/create-account \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"parentId\": \"$PARENT_ID\"}" | jq

# 4. Link parent to student
curl -X POST http://localhost:5001/api/admin/parents/link-student \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentId": "PARENT_ID",
    "studentId": "STUDENT_ID",
    "relationship": "MOTHER",
    "isPrimary": true
  }' | jq

# 5. Parent can now login with phone as password
```

---

## 🚀 Complete End-to-End Test

### Prerequisites
1. Backend running: `cd api && npm run dev`
2. Frontend running: `npm run dev`
3. Admin account exists
4. Students have some grades and attendance data

### Test Flow

**1. Run Migration (if not done yet)**
```bash
cd api
npx ts-node scripts/migrate-parent-data.ts
```

**2. Get Admin Token**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.edu.kh",
    "password": "admin123"
  }' | jq -r '.data.token'
```

**3. Check Parents Exist**
```bash
curl http://localhost:5001/api/admin/parents \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data.parents[0:3]'
```

**4. Pick a Parent and Login**
```bash
# Use a phone from step 3
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "PARENT_PHONE",
    "password": "PARENT_PHONE"
  }' | jq
```

**5. Test All Parent Endpoints**
```bash
export PARENT_TOKEN="TOKEN_FROM_STEP_4"

# Profile
curl http://localhost:5001/api/parent-portal/profile \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq

# Children
curl http://localhost:5001/api/parent-portal/children \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq

# Get student ID from children response
export STUDENT_ID="FIRST_CHILD_ID"

# Grades
curl "http://localhost:5001/api/parent-portal/child/$STUDENT_ID/grades?year=2025" \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq

# Attendance
curl "http://localhost:5001/api/parent-portal/child/$STUDENT_ID/attendance?month=12&year=2025" \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq

# Monthly summaries
curl "http://localhost:5001/api/parent-portal/child/$STUDENT_ID/monthly-summaries?year=2025" \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq

# Performance
curl "http://localhost:5001/api/parent-portal/child/$STUDENT_ID/performance?year=2025" \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq
```

**6. Test UI**
- Open: `http://localhost:3000/login`
- Login with parent credentials
- Test all tabs and features

---

## 📊 Verification Checklist

After migration, verify:

- [ ] All unique parents created (check count matches unique phone numbers)
- [ ] All parent user accounts created
- [ ] All student-parent links created
- [ ] Parents can login with phone as password
- [ ] Parents see their children on dashboard
- [ ] Parents can view grades for each child
- [ ] Parents can view attendance for each child
- [ ] Parents can view monthly summaries
- [ ] Parents can view performance analysis
- [ ] Parents can change password
- [ ] Parents can update profile
- [ ] Parents CANNOT see other students' data
- [ ] Mobile UI works correctly
- [ ] Khmer text displays properly

---

## 🔧 Troubleshooting

### Issue: Migration fails with "No students found"
**Solution:** Make sure students have parent data (fatherName, motherName, parentPhone)

### Issue: Parent can't login
**Solution:**
1. Check if parent user account was created
2. Verify password is same as phone number
3. Check if account is active

### Issue: Parent sees no children
**Solution:** Check if StudentParent links were created

### Issue: "Access denied" when viewing child data
**Solution:** Verify parent-student link exists in StudentParent table

### Issue: No grades/attendance shown
**Solution:** Make sure student has grade/attendance records in database

---

## 🎊 Success!

If all tests pass, your parent portal is ready to use! Parents can now:
- ✅ Login with their phone number
- ✅ Track all their children's academic progress
- ✅ View grades, attendance, and performance
- ✅ Access the portal from any device (mobile/tablet/desktop)
- ✅ Use it as a PWA (installable on mobile)

**Default Login for Testing:**
- Phone: Any parent phone from student records
- Password: Same as phone number
- **Important:** Parents should change their password after first login!
