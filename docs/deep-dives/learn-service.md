# Learn Service Architecture — Deep Dive

> **Port:** 3018  
> **Workspace:** `services/learn-service`  
> **Domain:** Hierarchical Curriculum, Instructor Dashboards, and Learning Analytics.

---

## 1. Core Concepts

The `learn-service` implements a 3-tier hierarchical curriculum model designed to match enterprise MOOC standards. It is decoupled from the `feed-service` to allow for specialized learning features and independent scaling.

### 1.1 The Hierarchy
- **Course**: The top-level product (e.g., "Fullstack React 2026").
- **Section**: Logical grouping of content (e.g., "Module 1: Getting Started").
- **Item**: The actual learning content. Supports multiple types:
  - `VIDEO`: Embedded streaming content.
  - `ARTICLE`: Markdown-based reading material.
  - `QUIZ`: Interactive assessment (coming soon).

---

## 2. API Architecture

### 2.1 Aggregated Data Fetching (`/learn-hub`)
To optimize mobile and web performance, the service provides an aggregation endpoint that returns all data needed for the main learning dashboard in a single round-trip.

- **Endpoint**: `GET /courses/learn-hub`
- **Logic**: Executes parallel Prisma queries for:
  - Marketplace (published courses)
  - Enrollment (user's active courses)
  - Creator Hub (instructor's own courses)
  - Learning Paths
  - User Stats (points, streaks, hours)

### 2.2 Instructor Analytics (`/instructor/stats`)
A dedicated endpoint for instructors to monitor their performance. It provides:
- **Stat Cards**: Total Students, Revenue, Rating, Active Courses.
- **Performance Data**: Mocked monthly growth arrays for visualization.
- **Course Breakdown**: Revenue and student counts per course.

---

## 3. Frontend Implementation Notes

### 3.1 Mobile SVG Charts
The Instructor Dashboard on mobile uses low-overhead SVG generation for performance:
- **Growth Chart**: Renders a dynamic `<Polyline />` in React Native SVG.
- **Glassmorphic UI**: Uses `@shopify/react-native-skia` (where available) or standard backdrop filters for a premium feel.

### 3.2 Web Detail Page
- **Safety**: Implements optional chaining for all instructor properties.
- **Hybrid View**: Supports both the new Hierarchical view (Sections) and a Legacy Flat view (Lessons without sections) for backward compatibility.

---

## 4. Key Files & Controllers

- `src/controllers/courses.controller.ts`: Main logic for Hub aggregation and detail views.
- `src/controllers/instructor.controller.ts`: Logic for the analytics dashboard.
- `src/controllers/sections.controller.ts`: Management of the 3-tier hierarchy.

---

## 5. Next Implementation Priorities

1. **Q&A System**: Threaded discussions at the Item level.
2. **Quiz Engine**: Full interactive quiz support in `CourseItem`.
3. **Draft Workflow**: Implementation of the `IN_REVIEW` and `PUBLISHED` states for high-quality moderation.
