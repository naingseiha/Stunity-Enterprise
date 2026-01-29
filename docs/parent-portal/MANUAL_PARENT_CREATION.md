# Manual Parent Account Creation Guide

## 📋 When to Use Manual Creation

Use manual creation for students who have:
- ❌ No parent phone number in database
- ❌ Only father name or mother name (incomplete data)
- ❌ Invalid phone number format
- ✅ These students were skipped during automatic migration

**Check the report:** `api/skipped-students-report.csv` (created after migration)

---

## 🔍 Step 1: Find Students Needing Parent Accounts

After running migration, you'll see a report like this:

```
⚠️  STUDENTS SKIPPED (Need Manual Parent Account Creation):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Student ID: 25100123
   Name: តេស្ត សុធា
   Reason: Has parent name but no phone number

2. Student ID: 25100456
   Name: ស្រី សុភា
   Reason: No parent data at all

📄 Skipped students exported to: ./skipped-students-report.csv
```

Open the CSV file to see all students needing manual parent accounts.

---

## 🛠️ Step 2: Manual Creation Options

You have 3 options:

### Option A: Create via API (Recommended)
Step-by-step API commands

### Option B: Create via Admin UI (Coming Soon)
Web interface for parent management

### Option C: Update Student Data & Re-run Migration
Add phone numbers to students, then re-run migration

---

## ✅ Option A: Create via API (Step-by-Step)

### Prerequisites

1. **Get Admin Token:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.edu.kh",
    "password": "admin123"
  }' | jq -r '.data.token'

export ADMIN_TOKEN="YOUR_TOKEN_HERE"
```

2. **Get Student ID:**
```bash
# Find the student who needs a parent account
curl http://localhost:5001/api/students/lightweight \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data[] | select(.studentId == "25100123") | {id, studentId, khmerName}'

export STUDENT_ID="STUDENT_ID_FROM_RESPONSE"
```

### Step 2.1: Create Parent Record

```bash
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
    "occupation": "គ្រូបង្រៀន",
    "address": "ភ្នំពេញ"
  }' | jq

# Save the parent ID from response
export PARENT_ID="PARENT_ID_FROM_RESPONSE"
```

**Relationship options:**
- `FATHER` - ឪពុក
- `MOTHER` - ម្តាយ
- `GUARDIAN` - អាណាព្យាបាល
- `STEP_FATHER` - ឪពុកចុង
- `STEP_MOTHER` - ម្តាយចុង
- `GRANDPARENT` - ជីតា/យាយ
- `OTHER` - ផ្សេងៗ

### Step 2.2: Create User Account for Parent

```bash
curl -X POST http://localhost:5001/api/admin/parents/create-account \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"parentId\": \"$PARENT_ID\"}" | jq

# ✅ User account created with:
# - Username: Parent's phone number
# - Password: Parent's phone number (they should change it)
# - Role: PARENT
```

### Step 2.3: Link Parent to Student

```bash
curl -X POST http://localhost:5001/api/admin/parents/link-student \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"parentId\": \"$PARENT_ID\",
    \"studentId\": \"$STUDENT_ID\",
    \"relationship\": \"MOTHER\",
    \"isPrimary\": true
  }" | jq

# ✅ Parent linked to student successfully
```

**Notes:**
- `isPrimary: true` - This parent is the primary contact
- If student has multiple parents, set only ONE as primary

### Step 2.4: Verify Parent Can Login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "012999888",
    "password": "012999888"
  }' | jq

# ✅ Should return token and user data
```

### Step 2.5: Test Parent Portal Access

```bash
# Get parent token from previous step
export PARENT_TOKEN="TOKEN_FROM_LOGIN"

# Get parent profile (should show linked children)
curl http://localhost:5001/api/parent-portal/profile \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq

# ✅ Should show parent info and linked children
```

---

## ✅ Option B: Batch Creation Script

For creating multiple parent accounts at once:

### Create Batch Script

Create file: `api/scripts/create-parents-batch.ts`

```typescript
import { PrismaClient, ParentRelationship } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateParentId } from "../src/utils/parentIdGenerator";

const prisma = new PrismaClient();

// Define your parents here
const parentsToCreate = [
  {
    firstName: "Sok",
    lastName: "Pisey",
    khmerName: "សុខ ពិសី",
    phone: "012999888",
    email: "parent1@example.com",
    relationship: ParentRelationship.MOTHER,
    occupation: "គ្រូបង្រៀន",
    studentIds: ["STUDENT_ID_1"], // Add student IDs to link
  },
  {
    firstName: "Chan",
    lastName: "Dara",
    khmerName: "ចន្ទ រដ្ឋា",
    phone: "012888999",
    relationship: ParentRelationship.FATHER,
    occupation: "កសិករ",
    studentIds: ["STUDENT_ID_2", "STUDENT_ID_3"], // Multiple children
  },
  // Add more parents here...
];

async function createParentsBatch() {
  console.log(`🚀 Creating ${parentsToCreate.length} parent accounts...`);

  for (const parentData of parentsToCreate) {
    try {
      // 1. Create Parent record
      const parentId = await generateParentId();
      const parent = await prisma.parent.create({
        data: {
          parentId,
          firstName: parentData.firstName,
          lastName: parentData.lastName,
          khmerName: parentData.khmerName,
          phone: parentData.phone,
          email: parentData.email,
          relationship: parentData.relationship,
          occupation: parentData.occupation,
          isAccountActive: true,
        },
      });

      console.log(`✅ Created parent: ${parent.khmerName} (${parent.phone})`);

      // 2. Create User account
      const hashedPassword = await bcrypt.hash(parentData.phone, 10);
      await prisma.user.create({
        data: {
          phone: parentData.phone,
          password: hashedPassword,
          role: "PARENT",
          parentId: parent.id,
        },
      });

      console.log(`  ✅ Created user account`);

      // 3. Link to students
      for (const studentId of parentData.studentIds) {
        await prisma.studentParent.create({
          data: {
            studentId,
            parentId: parent.id,
            relationship: parentData.relationship,
            isPrimary: true,
          },
        });
        console.log(`  ✅ Linked to student: ${studentId}`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating parent ${parentData.phone}:`, error.message);
    }
  }

  console.log("\n✅ Batch creation complete!");
  await prisma.$disconnect();
}

createParentsBatch();
```

**Run the batch script:**
```bash
cd api
npx ts-node scripts/create-parents-batch.ts
```

---

## ✅ Option C: Update Student Data & Re-run Migration

If you have many students with incomplete data, it may be easier to:

1. **Update Student records with parent phone numbers:**

```bash
# Example: Update a student's parent phone
curl -X PATCH http://localhost:5001/api/students/STUDENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentPhone": "012999888",
    "fatherName": "សុខ ពិសី",
    "motherName": "ចន្ទ រដ្ឋា"
  }' | jq
```

2. **Re-run migration:**

```bash
cd api
npx ts-node scripts/migrate-parent-data.ts
```

The migration script is **safe to re-run**:
- ✅ Skips parents that already exist
- ✅ Only creates new parents for newly added phone numbers
- ✅ Doesn't create duplicates

---

## 🔍 Verification Checklist

After manual creation, verify:

### 1. Parent Record Created
```bash
curl http://localhost:5001/api/admin/parents \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data.parents[] | select(.phone == "012999888")'
```

### 2. User Account Created
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "012999888",
    "password": "012999888"
  }' | jq '.success'
```

### 3. Student Link Created
```bash
export PARENT_TOKEN="TOKEN_FROM_LOGIN"

curl http://localhost:5001/api/parent-portal/children \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  | jq '.[] | {id, khmerName, class}'
```

### 4. Parent Portal Access Works
- Open: `http://localhost:3000/login`
- Login with: phone `012999888`, password `012999888`
- Should redirect to: `/parent-portal`
- Should see linked children

---

## 📊 Common Scenarios

### Scenario 1: Single Parent with One Child
```bash
# 1. Create parent → 2. Create account → 3. Link to 1 student
# Use steps 2.1, 2.2, 2.3 above
```

### Scenario 2: Single Parent with Multiple Children
```bash
# 1. Create parent → 2. Create account → 3. Link to student A → 4. Link to student B
# Repeat step 2.3 for each child
```

### Scenario 3: Student with Two Parents (Father + Mother)
```bash
# 1. Create father → link to student (isPrimary: true)
# 2. Create mother → link to student (isPrimary: false)
# Both parents can login and see the child
```

### Scenario 4: Divorced Parents (Same Child, Different Accounts)
```bash
# 1. Create father with his phone → link to child
# 2. Create mother with her phone → link to child
# Each parent has separate account and can login independently
```

---

## 🛡️ Data Safety Notes

**100% Safe:**
- ✅ Manual creation ONLY adds new records
- ✅ Never modifies existing Student data
- ✅ Never deletes anything
- ✅ All existing features continue to work
- ✅ Old parent data (fatherName, motherName) stays in Student table

**Rollback (if needed):**
If you make a mistake, you can simply delete the Parent/User records:

```bash
# Delete parent account
curl -X DELETE http://localhost:5001/api/admin/parents/PARENT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# This will cascade delete:
# - Parent record
# - User account
# - StudentParent links
# - But NEVER touches Student table
```

---

## 📝 Quick Reference

### Create Parent Account (3 Commands)
```bash
# 1. Create parent
POST /api/admin/parents/create

# 2. Create user account
POST /api/admin/parents/create-account

# 3. Link to student
POST /api/admin/parents/link-student
```

### Default Credentials
- Username: Parent's phone number
- Password: Parent's phone number
- **Important:** Parent should change password after first login!

### Parent Relationships
- `FATHER` - ឪពុក
- `MOTHER` - ម្តាយ
- `GUARDIAN` - អាណាព្យាបាល
- `STEP_FATHER` - ឪពុកចុង
- `STEP_MOTHER` - ម្តាយចុង
- `GRANDPARENT` - ជីតា/យាយ/តា/យយ
- `OTHER` - ផ្សេងៗ

---

## ❓ FAQ

### Q: Can I create parent account without phone number?
**A:** No, phone number is required for login. You must collect parent's phone number first.

### Q: What if parent doesn't have phone?
**A:** Use a family member's phone or school's contact number temporarily. Parent can update later.

### Q: Can one phone number be used for multiple parent accounts?
**A:** No, phone numbers must be unique (used for login). Siblings should share same parent account.

### Q: What if I make a mistake during creation?
**A:** Simply delete the parent account and create again. No data loss.

### Q: Do I need to update Student table?
**A:** No, Student table is NOT modified. Old parent data stays for backward compatibility.

### Q: Will existing features break?
**A:** No, all existing features continue to work. The parent portal is an additional feature.

---

## ✅ Success!

After manual creation:
- ✅ Parent can login with phone + password
- ✅ Parent sees linked children on dashboard
- ✅ Parent can track grades, attendance, performance
- ✅ Parent can access from any device
- ✅ All existing system features still work perfectly

For help, check:
- **Migration guide:** `HOW_TO_TEST_PARENT_PORTAL.md`
- **API documentation:** `PARENT_PORTAL_IMPLEMENTATION.md`
- **Workflow diagrams:** `PARENT_PORTAL_WORKFLOW.md`
