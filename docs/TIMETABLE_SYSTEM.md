# Stunity Timetable Management System

## Complete Documentation

---

## Overview

The Timetable Management System is designed to handle scheduling for a Cambodian school with:
- **Secondary School** (Grades 7-9): 13 classes (7ABCDE, 8ABCD, 9ABCD)
- **High School** (Grades 10-12): 20 classes (10ABCDEFG, 11ABCDEFG, 12ABCDEF)
- **~60 teachers** with subject specializations
- **6 school days** (Monday - Saturday)
- **2 shifts**: Morning (7:00 AM - 12:00 PM) & Afternoon (12:00 PM - 5:00 PM)

---

## Page Structure

### 1. Timetable Page (`/timetable`)
**Purpose**: Edit individual class or teacher timetables

**Features**:
- View/edit single class timetable
- View teacher schedule
- Overview of all classes with coverage stats
- Add/edit/delete timetable entries
- Auto-assign teachers to empty slots
- Export to CSV
- Print functionality

**View Modes**:
| Mode | Description |
|------|-------------|
| Class View | Edit timetable for a single class |
| Teacher View | View a teacher's weekly schedule across all classes |
| Overview | Quick stats for all classes |

**URL Parameters**:
- `?classId=xxx` - Pre-select a specific class to edit

---

### 2. Master Timetable Page (`/timetable/master`)
**Purpose**: School-wide overview and navigation hub

**Features**:
- Overview of ALL classes grouped by grade
- Visual coverage indicators (color-coded progress bars)
- Statistics dashboard (total slots, filled, coverage %)
- Grade level filtering (Secondary vs High School)
- Click any class card → navigates to Timetable Page for editing
- Shift schedule preview per class

**Use Case**: Administrators use this to:
1. See which classes need attention (low coverage)
2. Monitor overall progress
3. Quickly navigate to any class for editing

---

## Key Differences

| Feature | Timetable Page | Master Timetable |
|---------|---------------|------------------|
| **Scope** | Single class/teacher | All classes overview |
| **Editing** | Full CRUD operations | View only (click to edit) |
| **Primary Use** | Data entry & scheduling | Monitoring & navigation |
| **Grid View** | Full timetable grid | Class cards with stats |
| **Target User** | Schedule administrator | School principal/admin |

---

## Shift System

### Default Schedule Pattern
| Grade Level | Default Shift | Rationale |
|-------------|--------------|-----------|
| Secondary (7-9) | Afternoon (12PM-5PM) | Younger students in PM |
| High School (10-12) | Morning (7AM-12PM) | Exam classes in AM |

### Period Structure (5 periods per shift)
**Morning Shift**:
| Period | Time |
|--------|------|
| 1 | 7:00 - 7:50 |
| 2 | 7:50 - 8:40 |
| Break | 8:40 - 9:00 |
| 3 | 9:00 - 9:50 |
| 4 | 9:50 - 10:40 |
| Break | 10:40 - 11:00 |
| 5 | 11:00 - 11:50 |

**Afternoon Shift**:
| Period | Time |
|--------|------|
| 1 | 12:00 - 12:50 |
| 2 | 12:50 - 13:40 |
| Break | 13:40 - 14:00 |
| 3 | 14:00 - 14:50 |
| 4 | 14:50 - 15:40 |
| Break | 15:40 - 16:00 |
| 5 | 16:00 - 16:50 |

### Configurable Shifts
Classes can have different shifts on different days. Example:
- Grade 10A: Morning (Mon-Thu), Afternoon (Fri-Sat)
- This is configured via `ClassShiftConfig` component

---

## Component Architecture

```
/apps/web/src/components/timetable/
├── types.ts                 # All TypeScript interfaces
├── index.ts                 # Component exports
├── TeacherCard.tsx          # Draggable teacher card
├── TeacherSidebar.tsx       # Teacher list with filters
├── TimetableCell.tsx        # Grid cell (droppable)
├── ClassTimetableGrid.tsx   # Full class grid
├── SubjectHoursTracker.tsx  # Subject hours completion
├── AssignEntryModal.tsx     # Add/edit entry modal
├── TimetableEditor.tsx      # Main editor with DnD
└── ClassShiftConfig.tsx     # Shift configuration
```

---

## API Endpoints

### Existing Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/periods` | List school periods |
| POST | `/periods/bulk` | Create default periods |
| GET | `/timetable/class/:classId` | Get class timetable |
| GET | `/timetable/teacher/:teacherId` | Get teacher schedule |
| POST | `/timetable/entry` | Create timetable entry |
| PUT | `/timetable/entry/:id` | Update entry |
| DELETE | `/timetable/entry/:id` | Delete entry |
| POST | `/timetable/auto-assign` | Auto-assign teachers |
| GET | `/timetable/all-classes` | Get all classes with stats |

### New Endpoints (Added)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/timetable/teacher-availability` | Check which teachers are busy at a time slot |
| POST | `/timetable/entry-by-period` | Create entry using period number |
| POST | `/timetable/move-entry` | Move entry to new slot |
| GET | `/timetable/master-stats` | School-wide statistics |
| GET | `/timetable/all-teacher-workloads` | All teacher hours |

---

## Data Models

### TimetableEntry
```typescript
interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string | null;
  teacherId: string | null;
  periodNumber: number;      // 1-5
  dayOfWeek: DayOfWeek;      // MONDAY-SATURDAY
  room?: string;
  academicYearId: string;
}
```

### ClassShiftSchedule
```typescript
interface ClassShiftSchedule {
  classId: string;
  dayOfWeek: DayOfWeek;
  shiftType: ShiftType;      // MORNING or AFTERNOON
}
```

### Teacher with Workload
```typescript
interface Teacher {
  id: string;
  firstName?: string;
  lastName?: string;
  subjects: TeacherSubject[];
  totalHoursAssigned: number;
  maxHoursPerWeek: number;   // Default: 25
}
```

---

## Conflict Detection Rules

1. **Teacher Double-Booking**: Same teacher cannot be assigned to 2 classes at the same day/period
2. **Class Double-Booking**: Same class cannot have 2 different subjects at the same day/period
3. **Hours Exceeded Warning**: Alert when teacher exceeds `maxHoursPerWeek`
4. **Subject Incomplete Warning**: Alert when subject hours < required hours

---

## Future Improvements

### High Priority
- [ ] **Auto-Generate Full Timetable**: Algorithm to fill all empty slots for all classes
- [ ] **PDF Export**: Generate printable PDFs for:
  - Individual class timetables
  - Teacher schedules
  - Master school timetable
- [ ] **Subject Hours Configuration**: UI to set required hours per subject per grade
- [ ] **Teacher Substitution**: Handle teacher absences and substitutes

### Medium Priority
- [x] **Copy Timetable**: Copy one class's timetable to another class ✅ Implemented
- [x] **Clear Timetable**: Clear all entries for a class ✅ Implemented
- [ ] **Timetable Templates**: Save and load timetable patterns
- [ ] **Room Management**: Track room availability and conflicts
- [ ] **Drag & Drop Between Classes**: Move entries across different class timetables

### Low Priority
- [ ] **Mobile View**: Responsive timetable for phones
- [ ] **Student View**: Students see their class timetable
- [ ] **Parent View**: Parents see their child's schedule
- [ ] **Notifications**: Email teachers when their schedule changes
- [ ] **Version History**: Undo/redo and revision tracking
- [ ] **Constraints Editor**: Define rules like "No PE after lunch"

---

## Recent Updates (Feb 2026)

### New Features Added
1. **Copy Timetable**: Copy entries from one class to another with automatic conflict detection
2. **Clear Timetable**: Clear all entries for a class in one click
3. **Saturday Support**: Full Monday-Saturday scheduling support
4. **Improved Teacher Assignment**: Fixed teacher-subject queries for proper school filtering

### API Endpoints Added
| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/timetable/clear-class/:classId` | Clear all entries for a class |
| POST | `/timetable/copy-class` | Copy timetable between classes |

---

## Usage Workflow

### Initial Setup
1. Navigate to `/timetable`
2. Click "Setup Periods" to create default time slots
3. Click "Setup Shifts" to create morning/afternoon shifts
4. Go to Settings → Subjects to define subjects for each grade
5. Go to Settings → Teacher Subjects to assign which teachers can teach which subjects

### Creating Timetables
1. Go to `/timetable/master` for overview
2. Click a class card (e.g., "10A")
3. Redirects to `/timetable?classId=xxx`
4. Click empty cells to add entries (select subject + teacher)
5. Or use "Auto-Assign" button to fill automatically
6. Monitor progress via Master Timetable

### Checking Teacher Schedules
1. Go to `/timetable`
2. Switch to "By Teacher" view
3. Select a teacher from dropdown
4. View their full weekly schedule across all classes

---

## Technical Notes

### Drag & Drop
- Uses `@dnd-kit/core` library
- Teachers can be dragged from sidebar to empty cells
- Entries can be dragged to move between slots
- Visual feedback shows valid drop targets

### State Management
- React hooks (useState, useEffect)
- No global state library (consider Zustand for scaling)
- API calls via fetch with JWT authentication

### Performance Considerations
- Loads data lazily (only selected class/teacher)
- Uses `useMemo` for expensive calculations
- Grid virtualization may be needed for 30+ periods

---

## File Locations

| File | Purpose |
|------|---------|
| `/apps/web/src/app/[locale]/timetable/page.tsx` | Main timetable editor page |
| `/apps/web/src/app/[locale]/timetable/master/page.tsx` | Master overview page |
| `/apps/web/src/components/timetable/` | Reusable components |
| `/apps/web/src/lib/api/timetable.ts` | API client functions |
| `/services/timetable-service/src/index.ts` | Backend API |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Basic timetable CRUD |
| 2.0 | Feb 2026 | Added Master Timetable, new components, shift system |

---

## Contact

For questions about this system, contact the development team.
