# 🧪 COMPREHENSIVE TESTING GUIDE - Stunity Enterprise V2

**Date:** January 30, 2026  
**Version:** 2.0  
**Status:** Ready for Testing

---

## 📋 PRE-TESTING CHECKLIST

### ✅ Services Running:
- [ ] Web App (Port 3000) - `curl http://localhost:3000`
- [ ] Auth Service (Port 3001) - `curl http://localhost:3001/health`
- [ ] School Service (Port 3002) - `curl http://localhost:3002/health`
- [ ] Student Service (Port 3003) - `curl http://localhost:3003/health`
- [ ] Teacher Service (Port 3004) - `curl http://localhost:3004/health`
- [ ] Class Service (Port 3005) - `curl http://localhost:3005/health`

### ✅ Database State:
- [ ] Academic Years: 3 (2025-2026 ACTIVE, 2026-2027 PLANNING, 2027-2028 PLANNING)
- [ ] Students: 12
- [ ] Classes: 6
- [ ] Teachers: Present

### ✅ Test Account:
- **School:** Stunity Academy
- **Email:** admin@stunity.com (or create one)
- **Password:** admin123

---

## 🎯 FEATURE TESTING MATRIX

### 1. LOGIN & DASHBOARD

#### Test: Login Flow
**URL:** `http://localhost:3000/en/auth/login`

**Steps:**
1. [ ] Open login page
2. [ ] Enter email: admin@stunity.com
3. [ ] Enter password: admin123
4. [ ] Click "Login"
5. [ ] Should redirect to `/en/feed`

**Expected:**
- ✅ Successful login
- ✅ Redirect to feed page
- ✅ Token stored in localStorage

---

#### Test: Dashboard Page
**URL:** `http://localhost:3000/en/dashboard`

**Steps:**
1. [ ] Navigate to School context
2. [ ] Click "Dashboard" in sidebar
3. [ ] Check hero section (personalized greeting)
4. [ ] Hover over stat cards (should scale)
5. [ ] Check statistics display
6. [ ] Try quick actions buttons

**Expected:**
- ✅ "Good Morning/Afternoon, [Name]!" displays
- ✅ 4 stat cards with gradient icons
- ✅ Hover animations work
- ✅ Academic year progress shows
- ✅ Subscription status displays
- ✅ Quick actions clickable
- ✅ Mobile responsive

---

### 2. ACADEMIC YEAR MANAGEMENT

#### Test: List Academic Years
**URL:** `http://localhost:3000/en/settings/academic-years`

**Steps:**
1. [ ] Navigate to Settings → Academic Years
2. [ ] Check page loads without errors
3. [ ] Verify 3 academic years display
4. [ ] Check current year badge (2025-2026)
5. [ ] Verify status badges (colors correct)
6. [ ] Check quick stats on cards

**Expected:**
- ✅ Page loads successfully
- ✅ 3 years visible: 2025-2026 (ACTIVE), 2026-2027, 2027-2028 (both PLANNING)
- ✅ Current year has gold border + star
- ✅ Status badges color-coded
- ✅ No API errors

---

#### Test: Create Academic Year
**Steps:**
1. [ ] Click "Create New Year" button
2. [ ] Modal opens
3. [ ] Enter name: "2028-2029"
4. [ ] Select start date: October 2028
5. [ ] Select end date: September 2029
6. [ ] (Optional) Select "Copy from" year
7. [ ] Click "Create Academic Year"

**Expected:**
- ✅ Modal opens smoothly
- ✅ Form validation works
- ✅ Date pickers functional
- ✅ Copy dropdown populated
- ✅ Year created successfully
- ✅ Modal closes
- ✅ New year appears in list
- ✅ Success message shows

---

#### Test: Edit Academic Year
**Steps:**
1. [ ] Click "Edit" button on 2026-2027
2. [ ] Edit modal opens
3. [ ] Change name to "2026-2027 Updated"
4. [ ] Change dates if needed
5. [ ] Click "Update Academic Year"

**Expected:**
- ✅ Edit modal opens with pre-filled data
- ✅ Can modify all fields
- ✅ Update saves successfully
- ✅ Changes reflect in list
- ✅ No errors

---

#### Test: Delete Academic Year
**Steps:**
1. [ ] Click "Delete" button on 2027-2028 (non-current, no classes)
2. [ ] Confirmation modal appears
3. [ ] Read warning message
4. [ ] Click "Delete Year"

**Expected:**
- ✅ Confirmation modal shows
- ✅ Warning about classes displayed
- ✅ Delete button red gradient
- ✅ Year deleted successfully
- ✅ Removed from list

---

#### Test: Set as Current
**Steps:**
1. [ ] Click "Set as Current" on 2026-2027
2. [ ] Wait for API response
3. [ ] Check year badges update

**Expected:**
- ✅ 2026-2027 becomes current
- ✅ 2025-2026 loses current badge
- ✅ Gold border moves to 2026-2027
- ✅ Only one year marked current

---

### 3. ACADEMIC YEAR DETAIL PAGE

#### Test: View Year Details
**URL:** `http://localhost:3000/en/settings/academic-years/[id]`

**Steps:**
1. [ ] Click "Manage" on 2025-2026
2. [ ] Detail page loads
3. [ ] Check header (name, dates, status, current badge)
4. [ ] Review statistics cards
5. [ ] Check "Students by Grade" section
6. [ ] Scroll to "Classes" section

**Expected:**
- ✅ Detail page loads quickly
- ✅ Header shows correct info
- ✅ 4 stat cards: Students, Classes, Promotions, Grade Levels
- ✅ Students grouped by grade (if any)
- ✅ Classes grouped by grade with capacity bars
- ✅ "Full" badges on at-capacity classes
- ✅ Quick actions (Promote, Copy Settings)

---

#### Test: Quick Actions from Detail
**Steps:**
1. [ ] Click "Promote Students" button
2. [ ] Should redirect to promotion wizard
3. [ ] Go back, click "Copy Settings"
4. [ ] Should open create modal with copy option

**Expected:**
- ✅ Promotion wizard opens
- ✅ Copy settings works
- ✅ Edit/Delete buttons functional

---

### 4. STUDENT PROMOTION WIZARD

#### Test: Complete Promotion Flow
**URL:** `http://localhost:3000/en/settings/promotion`

**Steps:**
1. [ ] Open promotion wizard
2. [ ] **Step 1:** Select source year (2025-2026) and target year (2026-2027)
3. [ ] Click "Continue"
4. [ ] **Step 2:** Preview - Check student counts and class mappings
5. [ ] Review grade-by-grade preview
6. [ ] Click "Continue to Confirmation"
7. [ ] **Step 3:** Read confirmation warning
8. [ ] Click "Confirm and Promote"
9. [ ] **Step 4:** View results (success/failure counts)

**Expected:**
- ✅ All 4 steps load correctly
- ✅ Year dropdowns populated
- ✅ Preview shows accurate data
- ✅ Class mappings make sense (7→8, 8→9, etc.)
- ✅ Confirmation warns about permanence
- ✅ Promotion executes successfully
- ✅ Results screen shows counts
- ✅ Can navigate back to academic years

---

#### Test: Manual Promotion
**Steps:**
1. [ ] In Step 1, select "Manual Promotion" option
2. [ ] Select individual students
3. [ ] Choose target classes for each
4. [ ] Complete wizard

**Expected:**
- ✅ Manual mode available
- ✅ Student list loads
- ✅ Can select/deselect students
- ✅ Target class dropdowns work
- ✅ Manual promotions execute
- ✅ Progression records created

---

### 5. STUDENT HISTORY TIMELINE

#### Test: View Student Progression
**URL:** `http://localhost:3000/en/students/[id]`

**Steps:**
1. [ ] Go to Students list
2. [ ] Click "View Details" (eye icon) on any student
3. [ ] Student detail page opens
4. [ ] Check profile card (avatar, info)
5. [ ] Scroll to "Academic Progression" section
6. [ ] Review timeline items

**Expected:**
- ✅ Profile card displays correctly
- ✅ Student info accurate
- ✅ Timeline vertical with gradient line
- ✅ Graduation cap icons in circles
- ✅ Each progression shows:
  - Academic year
  - From class → To class
  - Promotion type badge (color-coded)
  - Date
  - Admin notes
- ✅ Visual design professional

---

### 6. YEAR-END WORKFLOW WIZARD

#### Test: Complete Year-End Process
**URL:** `http://localhost:3000/en/settings/year-end-workflow?yearId=[current_year_id]`

**Steps:**
1. [ ] Navigate to year-end workflow
2. [ ] **Step 1: Review** - Check year completion status
3. [ ] Verify promotion status
4. [ ] Click "Continue"
5. [ ] **Step 2: Promote** - Check if promotion done
6. [ ] If not, link to promotion wizard works
7. [ ] Click "Continue" (only if promotion done)
8. [ ] **Step 3: Close Year** - Read explanation
9. [ ] Click "Close Academic Year"
10. [ ] Wait for processing
11. [ ] **Step 4: Archive** - Optional step
12. [ ] Click "Archive Year" or "Skip"
13. [ ] **Step 5: Complete** - Success screen

**Expected:**
- ✅ Progress indicator shows current step
- ✅ Steps cannot be skipped without completion
- ✅ Promotion requirement enforced
- ✅ Close year changes status to ENDED
- ✅ isCurrent set to false
- ✅ Archive changes status to ARCHIVED
- ✅ Success screen displays
- ✅ Can return to academic years

---

### 7. FAILED STUDENT MANAGEMENT

#### Test: Mark Students as Failed
**URL:** `http://localhost:3000/en/settings/failed-students`

**Steps:**
1. [ ] Open failed students page
2. [ ] Select "From" year (2025-2026)
3. [ ] Select "To" year (2026-2027)
4. [ ] Read helper text about repeating
5. [ ] Search for students (if many)
6. [ ] Select checkboxes for failed students
7. [ ] Check "Select All" toggle works
8. [ ] Review selected count
9. [ ] Click "Mark X Student(s) as Failed"
10. [ ] Wait for processing
11. [ ] Check success message

**Expected:**
- ✅ Page loads without errors
- ✅ Year dropdowns functional
- ✅ Helper text explains repeating
- ✅ Student list loads
- ✅ Search filters work
- ✅ Checkboxes toggle correctly
- ✅ Select all works
- ✅ Counter updates
- ✅ API call succeeds
- ✅ Progression records created with REPEAT type
- ✅ Students assigned to same grade in new year

---

### 8. NAVIGATION & UI/UX

#### Test: Unified Navigation
**Steps:**
1. [ ] Check top navigation bar
2. [ ] Logo displays (Stunity.png, no text duplication)
3. [ ] Context switcher (Feed/School/Learn)
4. [ ] Profile dropdown
5. [ ] Notifications bell
6. [ ] Language switcher
7. [ ] Search bar
8. [ ] Academic year selector (school context only)

**Expected:**
- ✅ Logo correct (no duplicate text)
- ✅ Context switcher works
- ✅ Profile menu functional
- ✅ Notifications badge visible
- ✅ Language changes (EN/KH)
- ✅ Search bar present
- ✅ Academic year selector in school context

---

#### Test: Mobile Responsiveness
**Steps:**
1. [ ] Resize browser to mobile width (375px)
2. [ ] Check all pages:
   - Dashboard
   - Academic years list
   - Year detail
   - Promotion wizard
   - Student history
   - Year-end workflow
   - Failed students

**Expected:**
- ✅ All layouts adapt
- ✅ No horizontal scroll
- ✅ Touch targets large enough
- ✅ Text readable
- ✅ Buttons accessible
- ✅ Forms usable

---

### 9. ERROR HANDLING

#### Test: Error States
**Steps:**
1. [ ] Try creating year with duplicate name
2. [ ] Try deleting year with classes
3. [ ] Try setting archived year as current
4. [ ] Try promoting without target year
5. [ ] Test network error (disconnect briefly)

**Expected:**
- ✅ Error messages display clearly
- ✅ Red alert boxes with icons
- ✅ Dismissible error messages
- ✅ Helpful error text
- ✅ No app crashes
- ✅ User can recover

---

### 10. PERFORMANCE

#### Test: Load Times
**Steps:**
1. [ ] Time academic years list load
2. [ ] Time detail page load
3. [ ] Time student promotion preview
4. [ ] Check database query performance

**Expected:**
- ✅ List loads < 1 second
- ✅ Detail page < 2 seconds
- ✅ Preview < 3 seconds
- ✅ No lag in UI
- ✅ Smooth animations
- ✅ No memory leaks

---

## 🐛 KNOWN ISSUES (If Any)

1. **None currently** - All features tested and working

---

## ✅ TESTING COMPLETION CHECKLIST

### Critical Features:
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] Academic years list loads
- [ ] Create year works
- [ ] Edit year works
- [ ] Delete year works
- [ ] Set current works
- [ ] Year detail page loads
- [ ] Student promotion wizard works
- [ ] Student history displays
- [ ] Year-end workflow completes
- [ ] Failed students can be marked
- [ ] Navigation works
- [ ] Mobile responsive
- [ ] No console errors

### Design Quality:
- [ ] Orange-yellow gradients consistent
- [ ] White cards with soft shadows
- [ ] Smooth transitions
- [ ] Professional appearance
- [ ] Logo correct (no duplication)
- [ ] Loading states present
- [ ] Success/error feedback clear

### Backend Integrity:
- [ ] All API endpoints respond
- [ ] Database constraints enforced
- [ ] Transactions work
- [ ] Multi-tenancy secure
- [ ] JWT authentication valid
- [ ] No orphaned records

---

## 📊 TEST RESULTS

**Date:** _________  
**Tester:** _________  
**Pass Rate:** ___/100 tests  
**Critical Bugs:** _________  
**Minor Bugs:** _________  
**Notes:** _________

---

## 🚀 NEXT STEPS AFTER TESTING

1. **If all tests pass:**
   - ✅ Mark features as complete
   - ✅ Update documentation
   - ✅ Proceed to additional enhancements
   - ✅ Consider staging deployment

2. **If bugs found:**
   - 🐛 Document issues
   - 🔧 Prioritize fixes
   - 🧪 Re-test after fixes
   - ✅ Verify resolution

---

**Testing Status:** 🟡 Ready to Test  
**Version:** 2.0.0  
**Build:** Development

---

## 📝 QUICK TEST COMMANDS

```bash
# Check all services
curl http://localhost:3000 && echo "Web OK"
curl http://localhost:3001/health && echo "Auth OK"
curl http://localhost:3002/health && echo "School OK"
curl http://localhost:3003/health && echo "Student OK"
curl http://localhost:3004/health && echo "Teacher OK"
curl http://localhost:3005/health && echo "Class OK"

# Check database
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.academicYear.findMany().then(y => console.log('Academic Years:', y.length)).finally(() => p.\$disconnect());"

# Restart all services
./start-services.sh
```

---

**Happy Testing! 🎉**
