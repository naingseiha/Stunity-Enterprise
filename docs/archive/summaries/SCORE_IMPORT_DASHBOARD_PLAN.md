# Score Import Progress Dashboard - Implementation Plan

## 🎯 Feature Overview

A comprehensive dashboard that shows score import and verification progress for all grades and classes. Users can see at a glance:
- Which subjects have scores imported
- Which subjects are verified/confirmed
- Which classes have complete scores
- Overall completion statistics by grade/class/subject

**Target Users:** Admin, Teachers (homeroom), School Management

---

## 📊 Dashboard Requirements

### Key Metrics to Display

1. **Class-Level Statistics**
   - Total students in class
   - Number of subjects for that grade
   - Subjects with scores imported (count + percentage)
   - Subjects verified/confirmed (count + percentage)
   - Overall completion percentage
   - Last update timestamp

2. **Subject-Level Details**
   - Subject name (Khmer + English)
   - Score entry status: ✅ Complete | ⚠️ Partial | ❌ Empty
   - Verification status: ✅ Confirmed | ⚠️ Not Confirmed
   - Number of students with scores vs total students
   - Who last updated (teacher name)
   - Last update timestamp

3. **Grade-Level Aggregation**
   - Total classes in grade
   - Average completion percentage across all classes
   - Classes fully complete vs incomplete
   - Total subjects across grade
   - Overall verification rate

### Status Color Coding

```
Score Entry Status:
- 🟢 GREEN (Complete): 100% of students have scores
- 🟡 YELLOW (Partial): 50-99% of students have scores
- 🟠 ORANGE (Started): 1-49% of students have scores
- 🔴 RED (Empty): 0% of students have scores

Verification Status:
- 🟢 GREEN (Confirmed): Subject is verified
- 🟠 ORANGE (Not Confirmed): Subject not verified
- ⚪ GRAY (N/A): No scores to verify yet
```

---

## 🏗️ Technical Architecture

### Backend (API)

#### 1. New API Endpoint

**Route:** `GET /api/dashboard/score-progress`

**Query Parameters:**
- `month` (optional): Filter by month (Khmer or English)
- `year` (optional): Filter by year
- `grade` (optional): Filter by specific grade (7-12)
- `classId` (optional): Filter by specific class

**Response Structure:**
```typescript
{
  success: true,
  data: {
    month: "December",
    year: 2025,
    overall: {
      totalClasses: 24,
      totalSubjects: 180,
      completedSubjects: 120,
      completionPercentage: 66.67,
      verifiedSubjects: 80,
      verificationPercentage: 44.44
    },
    grades: [
      {
        grade: "7",
        totalClasses: 4,
        avgCompletion: 75.5,
        classes: [
          {
            id: "class-id-1",
            name: "ថ្នាក់ទី7ក",
            grade: "7",
            section: "ក",
            track: null,
            studentCount: 45,
            homeroomTeacher: {
              id: "teacher-id",
              firstName: "សុខា",
              lastName: "ជា",
              email: "sokha@school.edu.kh"
            },
            subjects: [
              {
                id: "subject-id-1",
                code: "KHM-G7",
                nameKh: "អក្សរសាស្ត្រខ្មែរ",
                nameEn: "Khmer Literature",
                maxScore: 50,
                coefficient: 3,
                scoreStatus: {
                  totalStudents: 45,
                  studentsWithScores: 45,
                  percentage: 100,
                  status: "COMPLETE" // COMPLETE | PARTIAL | STARTED | EMPTY
                },
                verification: {
                  isConfirmed: true,
                  confirmedBy: {
                    id: "user-id",
                    firstName: "Admin",
                    lastName: "System"
                  },
                  confirmedAt: "2025-12-15T10:30:00Z"
                },
                lastUpdated: "2025-12-15T10:30:00Z",
                lastUpdatedBy: {
                  id: "teacher-id",
                  firstName: "សុខា",
                  lastName: "ជា"
                }
              },
              // ... more subjects
            ],
            completionStats: {
              totalSubjects: 10,
              completedSubjects: 8,
              completionPercentage: 80,
              verifiedSubjects: 6,
              verificationPercentage: 60
            }
          },
          // ... more classes
        ]
      },
      // ... more grades
    ]
  }
}
```

#### 2. Database Query Strategy

```sql
-- Pseudo-query for grade data aggregation
SELECT
  c.id,
  c.name,
  c.grade,
  COUNT(DISTINCT s.id) as total_subjects,
  COUNT(DISTINCT g.subjectId) as subjects_with_grades,
  COUNT(DISTINCT gc.subjectId) as verified_subjects,
  COUNT(DISTINCT st.id) as total_students
FROM Class c
LEFT JOIN Subject s ON s.grade = c.grade
LEFT JOIN Grade g ON g.classId = c.id AND g.month = ? AND g.year = ?
LEFT JOIN GradeConfirmation gc ON gc.classId = c.id AND gc.month = ? AND gc.year = ?
LEFT JOIN Student st ON st.classId = c.id
GROUP BY c.id
ORDER BY c.grade, c.name
```

#### 3. Controller Logic

File: `/api/src/controllers/dashboard.controller.ts`

Add new function:
```typescript
export const getScoreProgress = async (req: Request, res: Response) => {
  try {
    const { month, year, grade, classId } = req.query;

    // 1. Get all classes (filtered if needed)
    // 2. For each class, get subjects for that grade
    // 3. For each subject, count students with scores
    // 4. Get confirmation status
    // 5. Aggregate statistics
    // 6. Return formatted response

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### Frontend (Client)

#### 1. API Client

File: `/src/lib/api/dashboard.ts` (new file)

```typescript
import { apiClient } from "./client";

export interface ScoreProgressData {
  month: string;
  year: number;
  overall: {
    totalClasses: number;
    totalSubjects: number;
    completedSubjects: number;
    completionPercentage: number;
    verifiedSubjects: number;
    verificationPercentage: number;
  };
  grades: GradeProgress[];
}

export interface GradeProgress {
  grade: string;
  totalClasses: number;
  avgCompletion: number;
  classes: ClassProgress[];
}

export interface ClassProgress {
  id: string;
  name: string;
  grade: string;
  section: string;
  track: string | null;
  studentCount: number;
  homeroomTeacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  subjects: SubjectProgress[];
  completionStats: {
    totalSubjects: number;
    completedSubjects: number;
    completionPercentage: number;
    verifiedSubjects: number;
    verificationPercentage: number;
  };
}

export interface SubjectProgress {
  id: string;
  code: string;
  nameKh: string;
  nameEn: string;
  maxScore: number;
  coefficient: number;
  scoreStatus: {
    totalStudents: number;
    studentsWithScores: number;
    percentage: number;
    status: "COMPLETE" | "PARTIAL" | "STARTED" | "EMPTY";
  };
  verification: {
    isConfirmed: boolean;
    confirmedBy?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    confirmedAt?: string;
  };
  lastUpdated?: string;
  lastUpdatedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const dashboardApi = {
  async getScoreProgress(params?: {
    month?: string;
    year?: number;
    grade?: string;
    classId?: string;
  }): Promise<ScoreProgressData> {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.grade) queryParams.append("grade", params.grade);
    if (params?.classId) queryParams.append("classId", params.classId);

    const query = queryParams.toString();
    const endpoint = `/dashboard/score-progress${query ? `?${query}` : ""}`;

    return apiClient.get<ScoreProgressData>(endpoint);
  },
};
```

#### 2. Desktop Dashboard Component

File: `/src/components/dashboard/ScoreProgressDashboard.tsx` (new file)

**Features:**
- Filter by month, year, grade
- Search classes by name
- Sort by completion percentage, verification rate
- Expandable class cards showing subject details
- Color-coded progress bars
- Real-time statistics
- Export to Excel/PDF functionality

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Score Import Progress Dashboard                        │
│ ─────────────────────────────────────────────────────  │
│ Filters: [Month ▼] [Year ▼] [Grade ▼] [Search...]     │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Overall Statistics                                │  │
│ │ ────────────────────────────────────────────────  │  │
│ │ Classes: 24  |  Subjects: 180  |  Completion: 67% │  │
│ │ Progress: [████████████░░░░░░░░] 67%              │  │
│ │ Verified: [████████░░░░░░░░░░░░] 44%              │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
│ Grade 7 (Avg: 75.5%)                                   │
│ ┌─────────────────────────────────────────────────┐   │
│ │ ថ្នាក់ទី7ក  •  45 students  •  Homeroom: សុខា    │   │
│ │ Progress: [████████████████░░░░] 80%              │   │
│ │ Verified: [████████████░░░░░░░░] 60%              │   │
│ │                                                    │   │
│ │ Subjects (Click to expand)                        │   │
│ │ ✅ អក្សរសាស្ត្រខ្មែរ (45/45) ✓ Confirmed          │   │
│ │ ✅ គណិតវិទ្យា (45/45) ✓ Confirmed                │   │
│ │ ⚠️ រូបវិទ្យា (30/45) ⚠️ Not Confirmed            │   │
│ │ ❌ គីមីវិទ្យា (0/45)                              │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [+ Show more classes...]                               │
└─────────────────────────────────────────────────────────┘
```

#### 3. Mobile Dashboard Component

File: `/src/components/mobile/dashboard/ScoreProgressDashboard.tsx` (new file)

**Features:**
- Mobile-optimized layout
- Swipeable class cards
- Quick filters
- Compact statistics
- Pull-to-refresh

**Layout:**
```
┌──────────────────────────┐
│ Score Progress           │
│                          │
│ [Month ▼] [Year ▼]      │
│ [Grade: All ▼]          │
│                          │
│ ┌────────────────────┐  │
│ │ Overall            │  │
│ │ 67% Complete       │  │
│ │ [████████░░░]      │  │
│ │ 44% Verified       │  │
│ │ [█████░░░░░░]      │  │
│ └────────────────────┘  │
│                          │
│ Grade 7                  │
│                          │
│ ┌────────────────────┐  │
│ │ ថ្នាក់ទី7ក          │  │
│ │ 45 students         │  │
│ │                     │  │
│ │ Complete: 80%       │  │
│ │ [████████░░]        │  │
│ │                     │  │
│ │ Verified: 60%       │  │
│ │ [██████░░░░]        │  │
│ │                     │  │
│ │ [View Details →]    │  │
│ └────────────────────┘  │
│                          │
│ [Swipe for more →]      │
└──────────────────────────┘
```

---

## 🎨 UI/UX Design Specifications

### Color System

```typescript
const STATUS_COLORS = {
  COMPLETE: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: "text-green-600",
    progress: "bg-green-500"
  },
  PARTIAL: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    icon: "text-yellow-600",
    progress: "bg-yellow-500"
  },
  STARTED: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    icon: "text-orange-600",
    progress: "bg-orange-500"
  },
  EMPTY: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: "text-red-600",
    progress: "bg-red-500"
  },
  CONFIRMED: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700"
  },
  NOT_CONFIRMED: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: "text-amber-600",
    badge: "bg-amber-100 text-amber-700"
  }
};
```

### Icons

```typescript
import {
  CheckCircle,    // Complete
  AlertCircle,    // Partial/Started
  XCircle,        // Empty
  Shield,         // Verified
  ShieldAlert,    // Not Verified
  TrendingUp,     // Progress
  Users,          // Students
  BookOpen,       // Subjects
  Calendar,       // Month/Year
  Filter,         // Filters
  Search,         // Search
  RefreshCw,      // Refresh
  Download        // Export
} from "lucide-react";
```

---

## 📝 Implementation Checklist

### Phase 1: Backend API (Priority: HIGH)
- [ ] Create database query for score aggregation
- [ ] Implement `/api/dashboard/score-progress` endpoint
- [ ] Add controller function with filtering logic
- [ ] Test with sample data
- [ ] Optimize query performance (add indexes if needed)

### Phase 2: Frontend API Client (Priority: HIGH)
- [ ] Create `/src/lib/api/dashboard.ts`
- [ ] Define TypeScript interfaces
- [ ] Implement `getScoreProgress()` function
- [ ] Add error handling

### Phase 3: Desktop Dashboard (Priority: MEDIUM)
- [ ] Create base dashboard component
- [ ] Implement filter controls (month, year, grade)
- [ ] Create overall statistics panel
- [ ] Implement grade-level sections
- [ ] Create class progress cards
- [ ] Add subject detail expansion
- [ ] Implement search functionality
- [ ] Add sort functionality
- [ ] Add loading states
- [ ] Add refresh button
- [ ] Test responsiveness

### Phase 4: Mobile Dashboard (Priority: MEDIUM)
- [ ] Create mobile dashboard component
- [ ] Implement mobile-optimized layout
- [ ] Add swipe navigation
- [ ] Implement compact statistics
- [ ] Create mobile class cards
- [ ] Add pull-to-refresh
- [ ] Test on various screen sizes

### Phase 5: Integration & Testing (Priority: HIGH)
- [ ] Add dashboard route to navigation
- [ ] Add permission checks (Admin, Homeroom Teachers)
- [ ] Test with real production data
- [ ] Performance testing with large datasets
- [ ] Cross-browser testing
- [ ] Mobile device testing

### Phase 6: Polish & Enhancement (Priority: LOW)
- [ ] Add export to Excel functionality
- [ ] Add export to PDF functionality
- [ ] Add animations/transitions
- [ ] Add tooltips with detailed info
- [ ] Add keyboard shortcuts for desktop
- [ ] Add accessibility features (ARIA labels)

---

## 🔧 Helper Functions

### Calculate Status

```typescript
function calculateScoreStatus(
  totalStudents: number,
  studentsWithScores: number
): "COMPLETE" | "PARTIAL" | "STARTED" | "EMPTY" {
  const percentage = (studentsWithScores / totalStudents) * 100;

  if (percentage === 100) return "COMPLETE";
  if (percentage >= 50) return "PARTIAL";
  if (percentage > 0) return "STARTED";
  return "EMPTY";
}
```

### Get Status Color

```typescript
function getStatusColor(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.EMPTY;
}
```

### Format Progress Bar

```typescript
function ProgressBar({ percentage, status }: { percentage: number; status: string }) {
  const colors = getStatusColor(status);

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full ${colors.progress}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
```

---

## 🚀 Performance Considerations

1. **Database Optimization**
   - Add indexes on `classId`, `subjectId`, `month`, `year`
   - Use database views for complex aggregations
   - Cache frequently accessed data

2. **Frontend Optimization**
   - Implement pagination for large class lists
   - Use React.memo for class cards
   - Lazy load subject details
   - Debounce search input

3. **API Optimization**
   - Add response caching (5-minute TTL)
   - Implement query result pagination
   - Use field selection to reduce payload size

---

## 📊 Success Metrics

- Dashboard loads in < 2 seconds
- Filters apply in < 500ms
- Accurate real-time data sync
- Mobile-friendly (works on all screen sizes)
- Accessible (WCAG 2.1 Level AA)

---

## 🎯 Future Enhancements

1. **Real-time Updates**
   - WebSocket integration for live updates
   - Auto-refresh when scores are added

2. **Advanced Analytics**
   - Historical trends
   - Teacher performance metrics
   - Subject difficulty analysis

3. **Notifications**
   - Alert when class reaches 100% completion
   - Remind teachers of unverified subjects
   - Weekly progress reports via email

4. **Bulk Actions**
   - Bulk verify multiple subjects
   - Bulk export multiple classes
   - Bulk reminders to teachers

---

## 📌 Notes for Implementation

1. **Start with Backend** - Get the data structure right first
2. **Test with Real Data** - Use production-like dataset
3. **Mobile First** - Design for mobile, enhance for desktop
4. **Progressive Enhancement** - Basic features first, polish later
5. **User Feedback** - Get feedback from actual teachers/admins

---

## 📞 API Endpoint Reference

```
GET /api/dashboard/score-progress
Query Params: month, year, grade, classId
Auth: Required (Admin, Teacher)
Returns: ScoreProgressData
```

---

**Last Updated:** 2026-01-10
**Version:** 1.0
**Status:** Ready for Implementation

---

## 🎉 Good Luck!

This plan provides everything needed to implement the Score Progress Dashboard. Start a new conversation and reference this document to begin implementation step by step!
