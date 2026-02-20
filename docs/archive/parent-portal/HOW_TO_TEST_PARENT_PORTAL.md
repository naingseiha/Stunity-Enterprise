# How to Test Parent Portal - Simple Guide

## 🎯 Answer to Your Question

**Q: How do we get parent accounts? Automatic or manual?**

**A: BOTH options available!**

### Option 1: **Automatic (Recommended for First Time)** ⭐

I created a migration script that automatically converts all your existing student parent data (fatherName, motherName, parentPhone) into parent accounts.

**Run this ONE command:**
```bash
cd api
npx ts-node scripts/migrate-parent-data.ts
```

**What happens:**
- ✅ Reads all students with parent info
- ✅ Groups by phone number (siblings share same parent)
- ✅ Creates Parent records
- ✅ Creates User accounts (password = phone number)
- ✅ Links parents to students
- ✅ Shows you a detailed summary

**Example:** If you have 100 students with 80 unique parent phone numbers, it will create 80 parent accounts and link them correctly to their children.

### Option 2: **Manual (For New Parents Later)**

Admin can manually create new parent accounts via API:
```bash
# 1. Create parent
POST /api/admin/parents/create

# 2. Create user account
POST /api/admin/parents/create-account

# 3. Link to student
POST /api/admin/parents/link-student
```

---

## 🚀 Quick Start (5 Steps)

### Step 1: Start Your Servers

**Terminal 1 - Backend:**
```bash
cd /Users/naingseiha/Downloads/SchoolApp/SchoolManagementApp/api
npm run dev
```
Wait until you see: `✅ Server running on port 5001`

**Terminal 2 - Frontend:**
```bash
cd /Users/naingseiha/Downloads/SchoolApp/SchoolManagementApp
npm run dev
```
Wait until you see: `✓ Ready on http://localhost:3000`

### Step 2: Run Migration Script

**Terminal 3:**
```bash
cd /Users/naingseiha/Downloads/SchoolApp/SchoolManagementApp/api
npx ts-node scripts/migrate-parent-data.ts
```

**Expected output:**
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

✅ Migration completed successfully!
```

### Step 3: Get Admin Token

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.edu.kh",
    "password": "admin123"
  }' | jq -r '.data.token'
```

Copy the token and save it:
```bash
export ADMIN_TOKEN="paste_your_token_here"
```

### Step 4: Find a Parent Phone Number

```bash
curl http://localhost:5001/api/admin/parents \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data.parents[0:3] | .[] | {khmerName, phone, children: (.studentParents | length)}'
```

**Example output:**
```json
{
  "khmerName": "សុខ វិចិត្រា",
  "phone": "012345678",
  "children": 2
}
{
  "khmerName": "ចន្ទ រដ្ឋា",
  "phone": "012999888",
  "children": 1
}
```

Pick any phone number from the list.

### Step 5: Test Parent Login

**Via Command Line:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "012345678",
    "password": "012345678"
  }' | jq
```

**Via Browser:**
1. Open: `http://localhost:3000/login`
2. Enter:
   - Phone: `012345678` (or any phone from step 4)
   - Password: `012345678` (same as phone)
3. Click Login
4. Should redirect to: `http://localhost:3000/parent-portal`

---

## 🎨 What You Should See in the UI

### Dashboard Tab
![Dashboard](showing all children with scores and attendance)
- Welcome message with parent name
- Cards for each child showing:
  - Child's photo
  - Name and class
  - Average score
  - Attendance rate
- Refresh button

### Children Tab
![Children](detailed view with sub-tabs)
- Dropdown to select a child
- 4 sub-tabs:
  1. **Grades**: All subjects with scores and progress bars
  2. **Attendance**: Daily records with statistics
  3. **Monthly Summaries**: Progress over time
  4. **Performance**: Comparison with class average
- Load data button for each tab

### Profile Tab
![Profile](parent information and settings)
- Parent information (name, phone, email, address)
- List of linked children
- Change password button
- Logout button

### Notifications Tab
- "Coming Soon" message
- Preview of future features

---

## 🧪 Complete Test Flow

### Test 1: View Children
1. Login as parent
2. Go to Dashboard
3. ✅ Should see all your children
4. ✅ Each child shows average score and attendance

### Test 2: View Grades
1. Go to Children tab
2. Select a child from dropdown
3. Click "Grades" sub-tab
4. Click "ផ្ទុកទិន្នន័យ" (Load Data) button
5. ✅ Should see all subjects with scores
6. ✅ Should see progress bars
7. ✅ Should see average score

### Test 3: View Attendance
1. Stay in Children tab
2. Click "Attendance" sub-tab
3. Click "ផ្ទុកទិន្នន័យ" button
4. ✅ Should see daily attendance records
5. ✅ Should see statistics (present, absent, rate)

### Test 4: Change Password
1. Go to Profile tab
2. Click "ប្តូរពាក្យសម្ងាត់" (Change Password)
3. Enter:
   - Old password: `012345678`
   - New password: `newpassword123`
   - Confirm: `newpassword123`
4. Click Save
5. ✅ Should see success message
6. Logout and login with new password
7. ✅ Should work

### Test 5: Authorization
1. Note your child's ID
2. Get another student's ID (not your child)
3. Try to access via API:
```bash
curl "http://localhost:5001/api/parent-portal/child/OTHER_STUDENT_ID/grades" \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq
```
4. ✅ Should get error: "Access denied: This student is not your child"

---

## 📱 Test on Mobile

### Test 6: Mobile Access
1. Find your computer's IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Example: `192.168.1.100`

2. On your phone, open browser and go to:
   `http://192.168.1.100:3000/login`

3. Login with parent credentials

4. ✅ Should work smoothly on mobile

### Test 7: Install as PWA (iOS)
1. In Safari, tap the Share button
2. Tap "Add to Home Screen"
3. Name it "School Portal"
4. Tap "Add"
5. Open from home screen
6. ✅ Should open as a full-screen app

---

## ❓ Troubleshooting

### Issue: Migration says "No students found"
**Cause:** Your students don't have parent data (fatherName, motherName, parentPhone)

**Solution:** Check your database:
```bash
curl http://localhost:5001/api/students/lightweight \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data[0] | {fatherName, motherName, parentPhone}'
```

If null, you need to add parent data to students first, or create parents manually.

### Issue: Parent can't login
**Solution:**
1. Check if migration ran successfully
2. Verify parent user account exists:
```bash
curl http://localhost:5001/api/admin/parents \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data.parents[] | select(.phone == "012345678")'
```

### Issue: Parent sees no children
**Solution:** Check StudentParent links:
```bash
curl http://localhost:5001/api/parent-portal/children \
  -H "Authorization: Bearer $PARENT_TOKEN" | jq
```

### Issue: "Access denied" when viewing data
**Solution:** Make sure you're trying to access YOUR child's data, not another student's.

---

## 📝 Important Notes

### Default Passwords
⚠️ **After migration, all parent passwords = phone numbers**

Example:
- Phone: `012345678`
- Password: `012345678`

**Parents should change their password after first login!**

### Old Data is Safe
✅ The migration script does NOT modify or delete your existing student data. The old fields (fatherName, motherName, parentPhone) remain intact in the Student table for backward compatibility.

### Re-running Migration
✅ The script is safe to re-run. It checks for existing parents and skips them, only creating new ones.

---

## 🎊 Success!

If all tests pass, you're ready to go! Your parent portal is fully functional.

**What parents can do now:**
✅ Login with their phone number
✅ See all their children in one place
✅ Track grades for each child
✅ Track attendance for each child
✅ View monthly progress reports
✅ View performance analysis
✅ Change their password
✅ Access from any device (mobile/desktop)
✅ Use as PWA (installable app)

**What you need to tell parents:**
1. Go to: `http://yourschool.com/login`
2. Login with your phone number (phone = password first time)
3. **Change your password immediately!**
4. Explore all tabs to see your children's progress

---

## 📚 More Information

- **Complete Implementation Guide:** `PARENT_PORTAL_IMPLEMENTATION.md`
- **Detailed Testing Guide:** `PARENT_PORTAL_TESTING.md`
- **Workflow Diagrams:** `PARENT_PORTAL_WORKFLOW.md`
- **Migration Script:** `api/scripts/migrate-parent-data.ts`

Need help? Check the documentation or ask!
