# Parent Portal - Complete Workflow

## 📊 Data Flow Overview

```
OLD SYSTEM (Before)
┌─────────────────────┐
│   Student Table     │
├─────────────────────┤
│ studentId           │
│ khmerName           │
│ fatherName    ──────┼─── Stored in same table
│ motherName    ──────┼─── Not normalized
│ parentPhone   ──────┼─── Shared by siblings
│ parentOccupation    │
└─────────────────────┘

NEW SYSTEM (After)
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   Student Table     │      │  StudentParent      │      │   Parent Table      │
├─────────────────────┤      ├─────────────────────┤      ├─────────────────────┤
│ id                  │◄─────┤ studentId           │      │ id                  │
│ studentId           │      │ parentId            ├─────►│ parentId (P-2025-001)│
│ khmerName           │      │ relationship        │      │ khmerName           │
│ ...                 │      │ isPrimary           │      │ phone (unique)      │
│                     │      └─────────────────────┘      │ email               │
│ fatherName*         │                                   │ relationship        │
│ motherName*         │      * Many-to-Many               │ occupation          │
│ parentPhone*        │      * One parent → multiple kids └─────────────────────┘
└─────────────────────┘      * One kid → multiple parents           │
   *Kept for backward                                               │
    compatibility                                                   │
                                                                    ▼
                                                          ┌─────────────────────┐
                                                          │   User Table        │
                                                          ├─────────────────────┤
                                                          │ id                  │
                                                          │ phone               │
                                                          │ password            │
                                                          │ role: PARENT        │
                                                          │ parentId (FK)       │
                                                          └─────────────────────┘
```

---

## 🔄 Migration Process

### Step 1: Before Migration

```
Students in Database:
- Student A: father="សុខ វិចិត្រា", phone="012345678"
- Student B: father="សុខ វិចិត្រា", phone="012345678"  (same parent!)
- Student C: mother="ចន្ទ រដ្ឋា", phone="012999888"
```

### Step 2: Run Migration Script

```bash
cd api
npx ts-node scripts/migrate-parent-data.ts
```

### Step 3: After Migration

```
Parents Created:
✅ Parent 1 (P-2025-001)
   - Name: សុខ វិចិត្រា
   - Phone: 012345678
   - Linked to: Student A, Student B
   - User Account: Created (password: 012345678)

✅ Parent 2 (P-2025-002)
   - Name: ចន្ទ រដ្ឋា
   - Phone: 012999888
   - Linked to: Student C
   - User Account: Created (password: 012999888)
```

---

## 🎯 Complete User Flow

### For Admin

```
1. Run Migration (One Time)
   ↓
2. Migration creates all parent accounts automatically
   ↓
3. Verify parents in database
   ↓
4. [Optional] Create new parent accounts manually
   ↓
5. [Optional] Link/unlink students
   ↓
6. [Optional] Reset parent passwords
   ↓
7. [Optional] Build admin UI for parent management
```

### For Parent

```
1. Receive phone number from school
   ↓
2. Go to: http://school.edu.kh/login
   ↓
3. Login with:
   - Phone: 012345678
   - Password: 012345678 (first time)
   ↓
4. Redirected to: /parent-portal
   ↓
5. View Dashboard
   - See all children
   - See average scores
   - See attendance rates
   ↓
6. View Children Tab
   - Select a child
   - View grades (by subject)
   - View attendance (daily)
   - View monthly summaries
   - View performance analysis
   ↓
7. View Profile Tab
   - Change password (important!)
   - Update contact info
   - View linked children
   ↓
8. Access from any device
   - Desktop
   - Tablet
   - Mobile (PWA)
```

---

## 🔐 Authentication & Authorization

### Login Process

```
Parent Login Request
└─► Check User table (phone + password)
    └─► Verify role = PARENT
        └─► Check Parent.isAccountActive = true
            └─► Generate JWT token with:
                - userId
                - role: PARENT
                - parentId
                - children: [studentId1, studentId2]
            └─► Return token + user data
                └─► Frontend stores token
                    └─► Frontend redirects to /parent-portal
```

### Authorization for Child Data

```
Parent requests: GET /api/parent-portal/child/:studentId/grades
└─► Extract userId from JWT token
    └─► Find parent record by userId
        └─► Get parent's linked students (StudentParent table)
            └─► Check if requested studentId is in list
                ├─► YES: Return child's grades ✅
                └─► NO: Return "Access denied" ❌
```

---

## 🛠️ API Endpoints

### Parent Portal (8 endpoints)

```
Authentication Required: Bearer Token with PARENT role

GET    /api/parent-portal/profile
       → Get parent info + all children

GET    /api/parent-portal/children
       → Get children with stats (average, attendance)

GET    /api/parent-portal/child/:studentId/grades?year=2025&month=ធ្នូ
       → Get child's grades

GET    /api/parent-portal/child/:studentId/attendance?month=12&year=2025
       → Get child's attendance

GET    /api/parent-portal/child/:studentId/monthly-summaries?year=2025
       → Get monthly progress

GET    /api/parent-portal/child/:studentId/performance?year=2025
       → Get performance analysis

POST   /api/parent-portal/change-password
       { oldPassword, newPassword }

PUT    /api/parent-portal/profile
       { firstName, lastName, email, address... }
```

### Admin Parent Management (10 endpoints)

```
Authentication Required: Bearer Token with ADMIN role

GET    /api/admin/parents/statistics
       → Parent statistics

GET    /api/admin/parents?page=1&limit=10&search=...
       → Get all parents (paginated)

POST   /api/admin/parents/create
       { firstName, lastName, khmerName, phone, relationship... }

POST   /api/admin/parents/create-account
       { parentId }

POST   /api/admin/parents/link-student
       { parentId, studentId, relationship, isPrimary }

DELETE /api/admin/parents/unlink-student
       { parentId, studentId }

POST   /api/admin/parents/reset-password
       { parentId }

PUT    /api/admin/parents/:id/toggle-status
       → Activate/deactivate

PUT    /api/admin/parents/:id
       { ...updated fields }

DELETE /api/admin/parents/:id
       → Delete parent
```

---

## 📱 Frontend Structure

```
/parent-portal (Main Page)
├─► Dashboard Tab
│   ├─ Welcome card with parent name
│   ├─ Children overview cards
│   │  ├─ Child photo
│   │  ├─ Name & class
│   │  ├─ Average score
│   │  └─ Attendance rate
│   └─ Refresh button
│
├─► Children Tab
│   ├─ Child selector dropdown
│   ├─ Sub-tabs:
│   │  ├─ Grades
│   │  │  ├─ Subject list with scores
│   │  │  ├─ Progress bars
│   │  │  └─ Statistics
│   │  ├─ Attendance
│   │  │  ├─ Daily records
│   │  │  ├─ Calendar view
│   │  │  └─ Statistics
│   │  ├─ Monthly Summaries
│   │  │  ├─ Month-by-month progress
│   │  │  └─ Line chart
│   │  └─ Performance
│   │     ├─ Subject comparison
│   │     ├─ Class average vs student
│   │     └─ Performance level indicators
│   └─ Load data button
│
├─► Profile Tab
│   ├─ Parent information
│   │  ├─ Name (Khmer & English)
│   │  ├─ Phone & email
│   │  ├─ Address
│   │  ├─ Relationship
│   │  └─ Occupation
│   ├─ Linked children list
│   ├─ Change password button
│   └─ Logout button
│
└─► Notifications Tab
    └─ Coming soon message
       └─ Future features preview
```

---

## ✅ Testing Checklist

### Backend Testing

- [ ] Migration script runs successfully
- [ ] Parent records created correctly
- [ ] User accounts created with correct passwords
- [ ] Student-parent links created
- [ ] Login works with phone + password
- [ ] JWT token includes parentId
- [ ] Can get parent profile
- [ ] Can get children list
- [ ] Can get child's grades
- [ ] Can get child's attendance
- [ ] Can get monthly summaries
- [ ] Can get performance data
- [ ] Can change password
- [ ] Can update profile
- [ ] Authorization blocks access to other students

### Frontend Testing

- [ ] Parent redirects to /parent-portal after login
- [ ] Dashboard shows all children
- [ ] Child selector works
- [ ] Grades load correctly
- [ ] Attendance loads correctly
- [ ] Monthly summaries load
- [ ] Performance analysis loads
- [ ] Change password modal works
- [ ] Logout works
- [ ] Mobile responsive
- [ ] PWA installable
- [ ] Khmer text displays correctly
- [ ] Bottom navigation works

---

## 🎊 Success Criteria

### For Admins
✅ Can run migration to create all parent accounts at once
✅ Can create new parent accounts manually
✅ Can link/unlink parents to students
✅ Can reset parent passwords
✅ Can activate/deactivate parent accounts

### For Parents
✅ Can login with phone number
✅ Can see all their children in one place
✅ Can track each child's grades, attendance, and progress
✅ Can change their password
✅ Can access from mobile device as PWA
✅ Interface in Khmer language

### For System
✅ Secure authorization (parents can only see their children)
✅ Efficient queries with proper indexes
✅ Handles multi-child scenarios
✅ Backward compatible (old student data intact)
✅ Ready for production deployment

---

## 🚀 Next Steps

1. **Immediate:**
   - Run migration script
   - Test parent login
   - Verify data access

2. **Short Term:**
   - Build admin UI for parent management
   - Add notification system
   - Add more analytics/reports

3. **Long Term:**
   - Parent-teacher messaging
   - Assignment tracking
   - Payment integration
   - Event notifications
