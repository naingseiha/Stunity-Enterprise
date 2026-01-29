# Navigation Menu - Quick Guide

## 🎯 Where to Find Admin Features

### Desktop View (Sidebar)

When you login as **Admin**, you'll see the sidebar menu with these new items:

```
┌─────────────────────────────┐
│  School Management System   │
├─────────────────────────────┤
│  👤 អ្នកគ្រប់គ្រង (Admin)   │
├─────────────────────────────┤
│  📊 ផ្ទាំងគ្រប់គ្រង          │  ← Dashboard
│  👥 សិស្ស                     │  ← Students List
│  ✅ គ្រូបង្រៀន                │  ← Teachers
│  🎓 ថ្នាក់រៀន                 │  ← Classes
│  📚 មុខវិជ្ជា                  │  ← Subjects
│                             │
│  🛡️  គ្រប់គ្រងគណនី           │  ← NEW! Account Management
│  ⚙️  គ្រប់គ្រងតួនាទី          │  ← NEW! Role Management
│                             │
│  📝 ពិន្ទុ                    │  ← Grade Entry
│  📅 វត្តមាន                  │  ← Attendance
│  📊 របាយការណ៍               │  ← Reports
│  🏆 តារាងកិត្តិយស            │  ← Awards
│  📖 សៀវភៅតាមដានសិស្ស        │  ← Tracking Book
│  ⚙️  ការកំណត់                │  ← Settings
└─────────────────────────────┘
```

### Mobile View (Bottom Navigation)

On mobile, the bottom nav stays simple (5 items max):

```
┌─────────────────────────────────────────┐
│                                         │
│        [Your Content Here]              │
│                                         │
└─────────────────────────────────────────┘
┌─────┬─────┬─────┬─────┬─────┐
│ 📊  │ 📝  │ 📅  │ 👥  │ 📄  │  ← Bottom Nav
│ផ្ទាំង│ពិន្ទុ│វត្តមាន│ សិស្ស│របាយការណ៍│
└─────┴─────┴─────┴─────┴─────┘
```

For admin features on mobile, navigate from Dashboard → Menu → Select feature

---

## 🛡️ New Menu Items Explained

### 1. 🛡️ គ្រប់គ្រងគណនី (Account Management)
**English:** Account Management  
**Route:** `/admin/accounts`  
**Icon:** Shield (🛡️)  
**Color:** Red to Orange gradient

**What it does:**
- View account statistics
- Activate/Deactivate student accounts
- Bulk operations by grade or class
- Track reasons for changes

**When to use:**
- Managing free tier resource limits
- Semester/year transitions
- Graduated students
- Emergency situations

---

### 2. ⚙️ គ្រប់គ្រងតួនាទី (Role Management)
**English:** Role Management  
**Route:** `/admin/students`  
**Icon:** UserCog (⚙️)  
**Color:** Blue to Indigo gradient

**What it does:**
- Assign student roles (Leaders, Vice Leaders)
- Create student accounts
- Reset student passwords
- Search and filter students
- View role statistics

**When to use:**
- Assigning class leaders
- Managing student roles
- Resetting forgotten passwords
- Bulk account management

---

## 🎨 Visual Location in Sidebar

The new items are placed **between** "Subjects" and "Grade Entry":

```
[Subjects] 📚 ← Admin section continues
    ↓
[Account Management] 🛡️  ← NEW! (Admin only)
    ↓
[Role Management] ⚙️     ← NEW! (Admin only)
    ↓
[Grade Entry] 📝 ← Regular operations start
```

**Why this placement?**
- **Logical grouping:** Admin-specific features together
- **Before operations:** Management before daily tasks
- **Clear separation:** Admin setup vs daily operations

---

## 🔐 Access Control

### Admin Users See:
✅ Account Management  
✅ Role Management  
✅ All other menu items

### Teacher Users See:
❌ Account Management (hidden)  
❌ Role Management (hidden)  
✅ Dashboard, Grade Entry, Attendance, Reports

### Student Users See:
Only the Student Portal (no sidebar)

---

## 🚀 Quick Navigation

### From Dashboard to Account Management:
```
1. Look at sidebar (left side)
2. Scroll to find "🛡️ គ្រប់គ្រងគណនី"
3. Click it
4. You're in Account Management!
```

### From Dashboard to Role Management:
```
1. Look at sidebar (left side)
2. Scroll to find "⚙️ គ្រប់គ្រងតួនាទី"
3. Click it
4. You're in Role Management!
```

### Between the Two Pages:
```
Account Management ↔ Role Management
- Both are admin pages
- Both use similar design
- Easy to switch between
```

---

## 📱 Mobile Navigation

On mobile devices:

### Option 1: Direct URL
Type in browser:
- `/admin/accounts` for Account Management
- `/admin/students` for Role Management

### Option 2: Bookmark
Create bookmarks for quick access:
- 🛡️ Account Management
- ⚙️ Role Management

### Option 3: Menu Access
Some mobile layouts may show a hamburger menu (☰) where you can access all features.

---

## 🎯 Menu Item Details

### Account Management 🛡️
```
Icon: Shield
Label: គ្រប់គ្រងគណនី
Color: Red-Orange gradient
Route: /admin/accounts
Access: Admin only
```

**Features inside:**
- Statistics cards (4 cards)
- Deactivation controls
- Activation controls
- Confirmation dialogs
- Success/error messages

### Role Management ⚙️
```
Icon: UserCog (gear with user)
Label: គ្រប់គ្រងតួនាទី
Color: Blue-Indigo gradient
Route: /admin/students
Access: Admin only
```

**Features inside:**
- Student list table
- Search and filters
- Role badges
- Action buttons
- Statistics cards

---

## 💡 Tips

### Finding Features Quickly:
1. **Color coding:** Each menu has unique gradient
2. **Icon recognition:** Learn the icons (Shield, UserCog)
3. **Khmer labels:** Read full Khmer text
4. **Position:** Always between Subjects and Grade Entry

### Organizing Your Workflow:
```
Morning routine:
1. Check Dashboard (statistics)
2. Review Account Management (check active accounts)
3. Handle any role changes in Role Management
4. Proceed to daily tasks (Grade Entry, Attendance)
```

### Keyboard Shortcuts (Future):
Consider setting up:
- `Ctrl + 1` → Account Management
- `Ctrl + 2` → Role Management
- `Ctrl + 0` → Dashboard

---

## 🔍 Troubleshooting

### Can't see the menu items?
**Check:**
- Are you logged in as Admin?
- Is your browser cache cleared?
- Is the page fully loaded?

### Menu items not clickable?
**Try:**
- Refresh the page (F5)
- Clear browser cache
- Check internet connection

### Wrong page loads?
**Verify:**
- Correct route in URL bar
- Not redirected due to permissions
- Backend API is running

---

## 📊 Menu Statistics

### Total Menu Items:
- **Admin:** 13 items (includes 2 new ones)
- **Teacher:** 8 items
- **Student:** 0 items (no sidebar, only portal)

### New Items Added:
- **Account Management** (1st new item)
- **Role Management** (2nd new item)

### Menu Organization:
```
Admin Section (5 items):
- Dashboard
- Students
- Teachers
- Classes
- Subjects

Management Section (2 items): ← NEW!
- Account Management
- Role Management

Operations Section (6 items):
- Grade Entry
- Attendance
- Reports
- Awards
- Tracking Book
- Settings
```

---

## ✅ Quick Reference Card

Copy and print this:

```
╔═══════════════════════════════════════╗
║   ADMIN MENU - QUICK REFERENCE        ║
╠═══════════════════════════════════════╣
║  🛡️  គ្រប់គ្រងគណនី                  ║
║      → Activate/Deactivate accounts   ║
║      → View statistics                ║
║      → Bulk operations                ║
║                                       ║
║  ⚙️  គ្រប់គ្រងតួនាទី                 ║
║      → Assign student roles           ║
║      → Reset passwords                ║
║      → Search students                ║
║                                       ║
║  Location: Between "Subjects" and     ║
║            "Grade Entry" in sidebar   ║
║                                       ║
║  Access: Admin only                   ║
╚═══════════════════════════════════════╝
```

---

## 🎉 You're Ready!

The navigation menu is now updated with:
- ✅ 2 new menu items added
- ✅ Clear visual icons
- ✅ Khmer language labels
- ✅ Logical placement
- ✅ Admin-only access

**Happy managing!** 🚀
