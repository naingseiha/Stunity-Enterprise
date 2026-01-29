# Quick Testing Guide - Student Login Features

## 🧪 Test the New Features

### Prerequisites
1. ✅ Backend API is running (`api` folder)
2. ✅ Frontend is running (`npm run dev`)
3. ✅ Database migration is applied (see below if not)

### Apply Database Migration (If Needed)

```bash
cd api
npx prisma migrate dev --name add_student_login_and_roles
# OR for production:
npx prisma migrate deploy
```

---

## Test Scenario 1: Admin Account Management

### Step 1: Login as Admin
1. Go to `http://localhost:3000/login`
2. Toggle to "Teacher Mode"
3. Login with admin credentials

### Step 2: View Account Statistics
1. Navigate to `/admin/accounts`
2. **Expected:** See statistics dashboard with:
   - Total students count
   - Active/Inactive breakdown
   - Activation rate
   - Statistics by grade (7-12)

### Step 3: Test Deactivation
1. Enter a reason: "Testing deactivation feature"
2. Click "បិទគណនីទាំងអស់" (Deactivate All)
3. Confirm action
4. **Expected:** Success message showing count
5. **Expected:** Statistics updated (all students now inactive)

### Step 4: Test Activation
1. Click "បើកគណនីទាំងអស់" (Activate All)
2. Confirm action
3. **Expected:** Success message showing count
4. **Expected:** Statistics updated (all students now active)

### Step 5: Test Grade-Level Operations
1. Select a grade from dropdown
2. Enter reason
3. Click "បិទគណនីតាមថ្នាក់" (Deactivate by Grade)
4. **Expected:** Only that grade deactivated
5. Click "បើកគណនីតាមថ្នាក់" (Activate by Grade)
6. **Expected:** That grade activated again

---

## Test Scenario 2: Student Role Management

### Step 1: Go to Student Management
1. Navigate to `/admin/students`
2. **Expected:** See list of all students with:
   - Student code
   - Name
   - Class
   - Current role
   - Account status

### Step 2: Test Search & Filters
1. Type student name in search box
2. **Expected:** List filters in real-time
3. Select a grade from dropdown
4. **Expected:** Only students in that grade shown
5. Select a role from dropdown
6. **Expected:** Only students with that role shown

### Step 3: Test Role Assignment
1. Find a student (preferably not a leader)
2. Click the shield icon (🛡️)
3. **Expected:** Modal opens showing current role
4. Change role to "CLASS_LEADER" (ប្រធានថ្នាក់)
5. Click "រក្សាទុក" (Save)
6. **Expected:** Success message
7. **Expected:** Student's role badge updated
8. **Expected:** Role statistics updated

### Step 4: Test Account Creation
1. Find a student without account (gray badge: "គ្មានគណនី")
2. Click the user-plus icon (👤+)
3. **Expected:** Modal shows student info and student code
4. Click "បង្កើតគណនី" (Create Account)
5. **Expected:** Success message with student code and password
6. **Expected:** Student now has green badge: "មានគណនី"
7. **Copy the student code and password for next test**

### Step 5: Test Password Reset
1. Find the student you just created account for
2. Click the key icon (🔑)
3. **Expected:** Modal shows confirmation
4. Click "កំណត់ឡើងវិញ" (Reset)
5. **Expected:** Success message with new password
6. **Expected:** New password is the student code

---

## Test Scenario 3: Student Login & Portal

### Step 1: Logout
1. Logout from admin account

### Step 2: Student Login
1. Go to `/login`
2. Toggle to "Student Mode" (សិស្ស)
3. **Expected:** Input placeholder changes to "លេខកូដសិស្ស/អ៊ីមែល/លេខទូរស័ព្ទ"
4. Enter the student code from Step 2.4
5. Enter the password (student code)
6. Click "ចូលប្រើប្រាស់"
7. **Expected:** Login successful
8. **Expected:** Redirected to `/student-portal`

### Step 3: View Student Portal
1. **Expected:** See student dashboard with:
   - Profile card (name, class, role)
   - Student information (code, class, role, contacts)
   - Quick stats cards (placeholders)
   - Security section

### Step 4: Test Password Change UI
1. Click "ផ្លាស់ប្តូរពាក្យសម្ងាត់" button
2. **Expected:** Modal opens with 3 fields
3. Try to submit without filling
4. **Expected:** Error: "សូមបំពេញព័ត៌មានទាំងអស់"
5. Fill with mismatched passwords
6. **Expected:** Error: "ពាក្យសម្ងាត់ថ្មីមិនត្រូវគ្នា"
7. Fill with password < 6 chars
8. **Expected:** Error message about length
9. Fill correctly
10. Click "រក្សាទុក"
11. **Expected:** Message about feature coming soon

### Step 5: Test Access Control
1. While logged in as student, try to access:
   - `/admin/accounts` → Should redirect
   - `/admin/students` → Should redirect
   - `/grade-entry` → Should redirect
2. **Expected:** Not accessible (redirected to login or portal)

---

## Test Scenario 4: Multiple Role Validation

### Step 1: Create Multiple Leaders
1. Login as admin
2. Go to `/admin/students`
3. Assign "CLASS_LEADER" to one student in a class
4. Try to assign "CLASS_LEADER" to another student in the same class
5. **Expected:** Backend should return error
6. **Expected:** UI shows error message

**Note:** Backend validation should prevent:
- More than 1 class leader per class
- More than 1 vice leader 1 per class
- More than 1 vice leader 2 per class

### Step 2: Verify Statistics
1. After role assignments, check statistics section
2. **Expected:** Counts updated correctly:
   - សិស្សធម្មតា (General)
   - ប្រធានថ្នាក់ (Class Leader)
   - អនុប្រធានទី១ (Vice Leader 1)
   - អនុប្រធានទី២ (Vice Leader 2)

---

## Test Scenario 5: Different Login Methods

### Step 1: Login with Student Code
1. Go to `/login` (Student Mode)
2. Enter student code (e.g., "STU001")
3. Enter password
4. **Expected:** Login successful

### Step 2: Login with Email (if student has email)
1. Logout
2. Go to `/login` (Student Mode)
3. Enter student email
4. Enter password
5. **Expected:** Login successful

### Step 3: Login with Phone (if student has phone)
1. Logout
2. Go to `/login` (Student Mode)
3. Enter student phone number
4. Enter password
5. **Expected:** Login successful

---

## ✅ Expected Results Summary

### Admin Account Management (/admin/accounts)
- ✅ Statistics load correctly
- ✅ Deactivate all works
- ✅ Activate all works
- ✅ Deactivate by grade works
- ✅ Activate by grade works
- ✅ Reason is required for deactivation
- ✅ Confirmation dialogs appear
- ✅ Success messages in Khmer
- ✅ Statistics refresh after operations

### Student Role Management (/admin/students)
- ✅ All students listed
- ✅ Search works in real-time
- ✅ Grade filter works
- ✅ Role filter works
- ✅ Role assignment works
- ✅ Account creation works
- ✅ Password reset works
- ✅ Role badges display correctly
- ✅ Account status badges correct
- ✅ Statistics update after role changes

### Student Portal (/student-portal)
- ✅ Student can login with code/email/phone
- ✅ Portal displays student info
- ✅ Role badge shows correctly
- ✅ Profile information complete
- ✅ Password change UI works (validation)
- ✅ Cannot access admin pages
- ✅ Responsive design

---

## 🐛 Known Issues / Limitations

1. **Password Change**: API not implemented yet (UI ready)
2. **View Grades**: API not implemented yet (UI placeholder ready)
3. **View Attendance**: API not implemented yet (UI placeholder ready)
4. **Leader Validation**: Backend handles, but UI could show better messages

---

## 🔧 Troubleshooting

### Issue: Can't see statistics
**Solution:** 
- Check backend is running
- Check database has students
- Check you're logged in as admin

### Issue: Can't create student account
**Possible causes:**
- Student already has account
- Student doesn't exist in database
- Backend API not running
- Database migration not applied

### Issue: Student can't login
**Possible causes:**
- Account not created yet
- Wrong password
- Account is deactivated
- Student code incorrect

### Issue: Role assignment fails
**Possible causes:**
- Another student already has that leader role in same class
- Backend validation failed
- Database constraint

---

## 📊 Test Checklist

Copy this checklist and mark as you test:

### Admin Account Management
- [ ] View statistics dashboard
- [ ] Deactivate all accounts
- [ ] Activate all accounts
- [ ] Deactivate by grade
- [ ] Activate by grade
- [ ] Confirmation dialogs work
- [ ] Success messages appear
- [ ] Error handling works

### Student Role Management
- [ ] View all students
- [ ] Search by name/code
- [ ] Filter by grade
- [ ] Filter by role
- [ ] Assign role to student
- [ ] Create account for student
- [ ] Reset student password
- [ ] Role badges display
- [ ] Statistics update

### Student Portal
- [ ] Login with student code
- [ ] Login with email
- [ ] Login with phone
- [ ] View profile
- [ ] See role badge
- [ ] Password change UI
- [ ] Access control works
- [ ] Responsive design

### Security
- [ ] Admin pages require admin role
- [ ] Student portal requires student role
- [ ] Deactivated students can't login
- [ ] Confirmation required for dangerous ops

---

## 🎉 Success!

If all tests pass, you have successfully implemented:
- ✅ Admin account management
- ✅ Student role management
- ✅ Student portal
- ✅ Multiple login methods
- ✅ Access control
- ✅ Khmer language support

Ready for production! 🚀
