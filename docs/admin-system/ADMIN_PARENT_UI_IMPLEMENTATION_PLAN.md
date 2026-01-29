# Admin Parent Management UI - Implementation Plan

## 🎯 Overview

Create a comprehensive admin interface to manage parent accounts, following the existing patterns from student and teacher management pages.

---

## 📋 Features to Implement

### Core Features
1. ✅ View all parents (with pagination)
2. ✅ Search and filter parents
3. ✅ Statistics dashboard (total parents, active accounts, linked students)
4. ✅ Create new parent record
5. ✅ Create user account for parent
6. ✅ Link parent to students (multiple students supported)
7. ✅ Unlink parent from students
8. ✅ Edit parent information
9. ✅ Reset parent password
10. ✅ Activate/Deactivate parent accounts
11. ✅ Delete parent record

### Additional Features
- View linked children for each parent
- Bulk operations (activate all, deactivate by grade)
- Export parent list to CSV
- View students without parent accounts
- Quick create: Find student → Create parent → Link

---

## 🗂️ File Structure

```
src/app/admin/parents/
├── page.tsx                          # Main parent management page

src/components/admin/parents/
├── ParentStatistics.tsx              # Statistics cards component
├── ParentFilters.tsx                 # Search and filter component
├── ParentTable.tsx                   # Parents data table
└── ParentActions.tsx                 # Action buttons component

src/components/forms/
├── ParentForm.tsx                    # Create/Edit parent form
├── LinkStudentForm.tsx               # Link parent to student form
└── ParentAccountForm.tsx             # Create user account form

src/components/modals/
├── CreateParentModal.tsx             # Create parent modal
├── EditParentModal.tsx               # Edit parent modal
├── LinkStudentModal.tsx              # Link student modal
├── UnlinkStudentModal.tsx            # Unlink confirmation
├── ResetParentPasswordModal.tsx      # Reset password modal
└── DeleteParentModal.tsx             # Delete confirmation modal

src/lib/api/
├── admin-parents.ts                  # Admin parent API client (already exists)
```

---

## 📝 Step-by-Step Implementation Plan

### Phase 1: Main Page Structure (Priority: HIGH)

#### Step 1.1: Create Main Page
**File:** `src/app/admin/parents/page.tsx`

**Tasks:**
1. Create page with `"use client"` directive
2. Import necessary hooks and components
3. Set up state management
4. Add auth check (ADMIN only)
5. Create page layout structure

**Code Template:**
```tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  UserCog,
  Link as LinkIcon,
  Unlink,
  Key,
  Shield,
  Trash,
  Edit,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function ParentsManagementPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State management
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [relationshipFilter, setRelationshipFilter] = useState("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);

  // Message
  const [message, setMessage] = useState(null);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== "ADMIN")) {
      router.push("/");
    }
  }, [currentUser, authLoading, router]);

  // Load data
  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      loadParents();
    }
  }, [currentUser]);

  const loadParents = async () => {
    // API call
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50/30 to-rose-50/30">
      {/* Content */}
    </div>
  );
}
```

**Time:** 30 minutes

---

#### Step 1.2: Add Page Header
**Location:** Inside main page return

**Code:**
```tsx
<div className="mb-8">
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Users className="w-8 h-8 text-purple-600" />
        <h1 className="font-khmer-title text-4xl text-gray-900">
          គ្រប់គ្រងគណនីឪពុកម្តាយ
        </h1>
      </div>
      <p className="font-khmer-body text-gray-600 ml-11">
        បង្កើត កែប្រែ និងគ្រប់គ្រងគណនីឪពុកម្តាយ
      </p>
    </div>
    <div className="flex gap-3">
      <button
        onClick={loadParents}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300
          text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-lg
          disabled:opacity-50 font-khmer-body"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "កំពុងផ្ទុក..." : "ផ្ទុកឡើងវិញ"}
      </button>
      <button
        onClick={() => setShowCreateModal(true)}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r
          from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700
          hover:to-pink-700 transition-all shadow-lg font-khmer-body"
      >
        <UserPlus className="w-4 h-4" />
        បង្កើតគណនីថ្មី
      </button>
    </div>
  </div>
</div>
```

**Time:** 15 minutes

---

### Phase 2: Statistics Component (Priority: HIGH)

#### Step 2.1: Create Statistics Cards
**File:** `src/components/admin/parents/ParentStatistics.tsx`

**Tasks:**
1. Display total parents
2. Display parents with accounts
3. Display parents without accounts
4. Display total linked students

**Code:**
```tsx
"use client";

import { Users, UserCheck, UserX, UsersRound } from "lucide-react";

interface ParentStatisticsProps {
  totalParents: number;
  withAccounts: number;
  withoutAccounts: number;
  linkedStudents: number;
}

export default function ParentStatistics({
  totalParents,
  withAccounts,
  withoutAccounts,
  linkedStudents,
}: ParentStatisticsProps) {
  const stats = [
    {
      label: "សរុប",
      value: totalParents,
      icon: Users,
      color: "purple",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "មានគណនី",
      value: withAccounts,
      icon: UserCheck,
      color: "green",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "គ្មានគណនី",
      value: withoutAccounts,
      icon: UserX,
      color: "red",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      label: "សិស្សបានភ្ជាប់",
      value: linkedStudents,
      icon: UsersRound,
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl
              transition-all border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
            <h3 className="font-khmer-body text-sm text-gray-600 mb-1">
              {stat.label}
            </h3>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
```

**Time:** 30 minutes

---

### Phase 3: Filters Component (Priority: HIGH)

#### Step 3.1: Create Filter Section
**File:** `src/components/admin/parents/ParentFilters.tsx`

**Features:**
- Search by name, phone, email
- Filter by account status (all, with account, without account)
- Filter by relationship type

**Code:**
```tsx
"use client";

import { Search, Filter } from "lucide-react";

interface ParentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  relationshipFilter: string;
  onRelationshipChange: (value: string) => void;
}

export default function ParentFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  relationshipFilter,
  onRelationshipChange,
}: ParentFiltersProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="font-khmer-body font-semibold text-gray-900">
          ការស្វែងរក និងតម្រង
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះ លេខទូរស័ព្ទ..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 p-3 border border-gray-200 rounded-xl
              font-khmer-body focus:ring-2 focus:ring-purple-500
              focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="p-3 border border-gray-200 rounded-xl font-khmer-body
            focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">ស្ថានភាព: ទាំងអស់</option>
          <option value="with-account">មានគណនី</option>
          <option value="without-account">គ្មានគណនី</option>
          <option value="active">សកម្ម</option>
          <option value="inactive">អសកម្ម</option>
        </select>

        {/* Relationship Filter */}
        <select
          value={relationshipFilter}
          onChange={(e) => onRelationshipChange(e.target.value)}
          className="p-3 border border-gray-200 rounded-xl font-khmer-body
            focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">តួនាទី: ទាំងអស់</option>
          <option value="FATHER">ឪពុក</option>
          <option value="MOTHER">ម្តាយ</option>
          <option value="GUARDIAN">អាណាព្យាបាល</option>
          <option value="STEP_FATHER">ឪពុកចុង</option>
          <option value="STEP_MOTHER">ម្តាយចុង</option>
          <option value="GRANDPARENT">ជីតា/យាយ</option>
          <option value="OTHER">ផ្សេងៗ</option>
        </select>
      </div>
    </div>
  );
}
```

**Time:** 30 minutes

---

### Phase 4: Data Table Component (Priority: HIGH)

#### Step 4.1: Create Parent Table
**File:** `src/components/admin/parents/ParentTable.tsx`

**Features:**
- Display parent list
- Show account status
- Show linked children count
- Action buttons (edit, link, account operations, delete)

**Code:**
```tsx
"use client";

import {
  Edit, Trash, Link as LinkIcon, Unlink, Key,
  UserCheck, UserX, Shield
} from "lucide-react";

interface Parent {
  id: string;
  parentId: string;
  khmerName: string;
  phone: string;
  email?: string;
  relationship: string;
  isAccountActive: boolean;
  user?: {
    id: string;
    isActive: boolean;
  };
  studentParents: Array<{
    student: {
      id: string;
      khmerName: string;
    };
  }>;
}

interface ParentTableProps {
  parents: Parent[];
  onEdit: (parent: Parent) => void;
  onLink: (parent: Parent) => void;
  onUnlink: (parent: Parent) => void;
  onCreateAccount: (parent: Parent) => void;
  onResetPassword: (parent: Parent) => void;
  onToggleStatus: (parent: Parent) => void;
  onDelete: (parent: Parent) => void;
}

export default function ParentTable({
  parents,
  onEdit,
  onLink,
  onUnlink,
  onCreateAccount,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: ParentTableProps) {
  const getRelationshipText = (relationship: string) => {
    const map: Record<string, string> = {
      FATHER: "ឪពុក",
      MOTHER: "ម្តាយ",
      GUARDIAN: "អាណាព្យាបាល",
      STEP_FATHER: "ឪពុកចុង",
      STEP_MOTHER: "ម្តាយចុង",
      GRANDPARENT: "ជីតា/យាយ",
      OTHER: "ផ្សេងៗ",
    };
    return map[relationship] || relationship;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left font-khmer-body text-sm font-bold text-gray-700">
                លេខសម្គាល់
              </th>
              <th className="px-6 py-4 text-left font-khmer-body text-sm font-bold text-gray-700">
                ឈ្មោះ
              </th>
              <th className="px-6 py-4 text-left font-khmer-body text-sm font-bold text-gray-700">
                តួនាទី
              </th>
              <th className="px-6 py-4 text-left font-khmer-body text-sm font-bold text-gray-700">
                ទំនាក់ទំនង
              </th>
              <th className="px-6 py-4 text-center font-khmer-body text-sm font-bold text-gray-700">
                កូន
              </th>
              <th className="px-6 py-4 text-center font-khmer-body text-sm font-bold text-gray-700">
                គណនី
              </th>
              <th className="px-6 py-4 text-right font-khmer-body text-sm font-bold text-gray-700">
                សកម្មភាព
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parents.map((parent) => (
              <tr
                key={parent.id}
                className="hover:bg-purple-50/50 transition-colors"
              >
                <td className="px-6 py-4 font-khmer-body text-sm text-gray-600">
                  {parent.parentId}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-khmer-body font-medium text-gray-900">
                      {parent.khmerName}
                    </p>
                    <p className="font-khmer-body text-sm text-gray-500">
                      {parent.phone}
                    </p>
                    {parent.email && (
                      <p className="text-xs text-gray-400">{parent.email}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-khmer-body text-sm text-gray-700">
                  {getRelationshipText(parent.relationship)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {parent.studentParents.slice(0, 2).map((sp) => (
                      <span
                        key={sp.student.id}
                        className="font-khmer-body text-xs text-gray-600"
                      >
                        • {sp.student.khmerName}
                      </span>
                    ))}
                    {parent.studentParents.length > 2 && (
                      <span className="text-xs text-gray-400">
                        + {parent.studentParents.length - 2} ទៀត
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8
                    rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                    {parent.studentParents.length}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {parent.user ? (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full
                        text-xs font-medium ${
                          parent.user.isActive
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                    >
                      {parent.user.isActive ? "សកម្ម" : "អសកម្ម"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full
                      text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      គ្មានគណនី
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    {/* Edit */}
                    <button
                      onClick={() => onEdit(parent)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg
                        transition-colors"
                      title="កែប្រែ"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Link Student */}
                    <button
                      onClick={() => onLink(parent)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg
                        transition-colors"
                      title="ភ្ជាប់សិស្ស"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>

                    {/* Account Operations */}
                    {!parent.user ? (
                      <button
                        onClick={() => onCreateAccount(parent)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg
                          transition-colors"
                        title="បង្កើតគណនី"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onResetPassword(parent)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg
                            transition-colors"
                          title="ប្តូរពាក្យសម្ងាត់"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleStatus(parent)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg
                            transition-colors"
                          title={parent.user.isActive ? "បិទគណនី" : "បើកគណនី"}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(parent)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg
                        transition-colors"
                      title="លុប"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {parents.length === 0 && (
          <div className="text-center py-16 font-khmer-body text-gray-500 bg-gray-50">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>មិនមានទិន្នន័យ</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Time:** 1 hour

---

### Phase 5: Form Components (Priority: MEDIUM)

#### Step 5.1: Parent Form
**File:** `src/components/forms/ParentForm.tsx`

Follow StudentForm pattern with sections:
1. Personal Information (firstName, lastName, khmerName, gender)
2. Contact Information (phone, email, address)
3. Guardian Information (relationship, occupation, emergencyPhone)

**Time:** 45 minutes

#### Step 5.2: Link Student Form
**File:** `src/components/forms/LinkStudentForm.tsx`

Features:
- Search for students
- Select student
- Choose relationship type
- Set as primary contact checkbox

**Time:** 30 minutes

---

### Phase 6: Modal Components (Priority: MEDIUM)

#### Step 6.1: Create Parent Modal
**File:** `src/components/modals/CreateParentModal.tsx`

Use ParentForm inside modal wrapper

**Time:** 20 minutes

#### Step 6.2: Link Student Modal
**File:** `src/components/modals/LinkStudentModal.tsx`

Use LinkStudentForm inside modal wrapper

**Time:** 20 minutes

#### Step 6.3: Other Modals
- EditParentModal (20 min)
- ResetParentPasswordModal (20 min)
- DeleteParentModal (15 min)
- UnlinkStudentModal (15 min)

**Total Time:** ~1.5 hours

---

### Phase 7: API Integration (Priority: HIGH)

#### Step 7.1: Connect to Backend APIs

All APIs already exist in `src/lib/api/admin-parents.ts`:
- GET /api/admin/parents
- POST /api/admin/parents/create
- POST /api/admin/parents/create-account
- POST /api/admin/parents/link-student
- DELETE /api/admin/parents/unlink-student
- POST /api/admin/parents/reset-password
- PUT /api/admin/parents/:id/toggle-status
- PUT /api/admin/parents/:id
- DELETE /api/admin/parents/:id

**Tasks:**
1. Import API functions
2. Call on page load
3. Call on user actions
4. Handle errors and loading states

**Time:** 30 minutes

---

### Phase 8: Testing & Polish (Priority: MEDIUM)

#### Step 8.1: Test All Features
- Create parent
- Edit parent
- Link student
- Unlink student
- Create account
- Reset password
- Activate/Deactivate
- Delete parent
- Search and filters

**Time:** 1 hour

#### Step 8.2: Polish UI
- Responsive design
- Loading states
- Error messages
- Success messages
- Empty states
- Confirmations

**Time:** 30 minutes

---

## ⏱️ Time Estimates

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Main page structure | 45 min |
| Phase 2 | Statistics component | 30 min |
| Phase 3 | Filters component | 30 min |
| Phase 4 | Data table | 1 hour |
| Phase 5 | Form components | 1.25 hours |
| Phase 6 | Modal components | 1.5 hours |
| Phase 7 | API integration | 30 min |
| Phase 8 | Testing & Polish | 1.5 hours |
| **TOTAL** | | **~7 hours** |

---

## 🎨 Design Decisions

### Color Scheme
- **Primary:** Purple/Pink gradient (to differentiate from students/teachers)
- **Accent:** Rose tones
- **Status Colors:**
  - Active: Green
  - Inactive: Red
  - No Account: Gray

### Icons
- Users: Main parent icon
- UserPlus: Create parent
- Link: Link student
- Unlink: Unlink student
- UserCheck: Create account
- Key: Reset password
- Shield: Toggle status
- Edit: Edit parent
- Trash: Delete parent

### Responsive Breakpoints
- Mobile: 1 column
- Tablet (md): 2-3 columns
- Desktop: 4 columns for stats, full table

---

## 📚 Reference Files

Use these as templates:
- `/src/app/admin/students/page.tsx` - Main structure
- `/src/components/forms/StudentForm.tsx` - Form pattern
- `/src/components/admin/modals/ResetPasswordModal.tsx` - Modal pattern
- `/src/lib/api/admin.ts` - API call pattern

---

## ✅ Implementation Checklist

### Before Starting
- [ ] Review existing admin pages (students, teachers, accounts)
- [ ] Understand the UI patterns
- [ ] Test backend APIs with Postman/curl
- [ ] Plan component hierarchy

### Phase 1: Foundation
- [ ] Create main page file
- [ ] Add auth check
- [ ] Set up state management
- [ ] Add page header
- [ ] Test page loads

### Phase 2: Core Components
- [ ] Create statistics component
- [ ] Create filters component
- [ ] Create data table component
- [ ] Test with mock data

### Phase 3: Forms & Modals
- [ ] Create ParentForm
- [ ] Create LinkStudentForm
- [ ] Create all modals
- [ ] Test form validation

### Phase 4: Integration
- [ ] Connect to backend APIs
- [ ] Handle loading states
- [ ] Handle errors
- [ ] Add success messages

### Phase 5: Polish
- [ ] Test all features
- [ ] Fix responsiveness
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add confirmations

### Final
- [ ] Full testing workflow
- [ ] Test on mobile
- [ ] Test on tablet
- [ ] Test on desktop
- [ ] Deploy

---

## 🚀 Quick Start Commands

```bash
# 1. Create necessary directories
mkdir -p src/app/admin/parents
mkdir -p src/components/admin/parents
mkdir -p src/components/modals

# 2. Start with main page
touch src/app/admin/parents/page.tsx

# 3. Create components
touch src/components/admin/parents/ParentStatistics.tsx
touch src/components/admin/parents/ParentFilters.tsx
touch src/components/admin/parents/ParentTable.tsx

# 4. Create forms
touch src/components/forms/ParentForm.tsx
touch src/components/forms/LinkStudentForm.tsx

# 5. Create modals
touch src/components/modals/CreateParentModal.tsx
touch src/components/modals/LinkStudentModal.tsx
```

---

## 📝 Notes

- Follow existing patterns from students/teachers pages
- Use Khmer fonts (font-khmer-body, font-khmer-title)
- Use Lucide icons consistently
- Test with real data after migration
- Handle edge cases (parent with no children, student with multiple parents)
- Add proper TypeScript types
- Add loading states everywhere
- Show meaningful error messages

---

## 🎯 Success Criteria

The implementation is complete when:
1. ✅ Admin can view all parents in a table
2. ✅ Admin can search and filter parents
3. ✅ Admin can create new parent records
4. ✅ Admin can create user accounts for parents
5. ✅ Admin can link parents to students (multiple links supported)
6. ✅ Admin can unlink parents from students
7. ✅ Admin can edit parent information
8. ✅ Admin can reset parent passwords
9. ✅ Admin can activate/deactivate parent accounts
10. ✅ Admin can delete parent records
11. ✅ UI follows existing design patterns
12. ✅ UI is fully responsive (mobile, tablet, desktop)
13. ✅ All features work without errors
14. ✅ Proper loading states and error handling
15. ✅ Khmer language support throughout

---

Ready to implement! Start with Phase 1 and work sequentially through each phase. 🚀
