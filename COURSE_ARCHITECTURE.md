# Global Learning Community & Course Architecture

This document details the architectural strategy for the **Stunity Course/Learn Community**. Unlike the School Management side of Stunity, which is tenant-isolated (by school), the Learning Community is a **global platform**. Any authenticated user can become an Instructor and create courses available to the entire community.

Because of this dual nature (anyone can learn, anyone can teach), we must structure the UI and Backend exactly like enterprise MOOC platforms such as **Udemy** or **Coursera**. 

---

## 1. The 3-Tiered Management Architecture

In real-world enterprise applications, course management is strictly separated based on the user's current context. Trying to combine the "Course Editor" UI and the "Course Video Player" UI into the same screens leads to terrible UX and complex conditional code.

We divide the experience into three distinct domains:

### A. The Learner Experience (Consumer Side)
When a user is acting as a student, the interface is optimized purely for discovery and consumption.
* **Routes:** `/learn` or `/courses`
* **Features:**
  * **Course Marketplace:** Browse courses by category, search, and recommendation feeds.
  * **My Learning:** A dashboard showing enrolled courses, progress bars, and recent activity.
  * **Course Consumption Player:** The video player UI. It includes a sidebar with Modules/Sections, and tabs beneath the video for **Overview**, **Q&A**, **Notes**, and **Announcements**.
  * **Certificates:** Viewing and downloading completed certificates.

### B. The Instructor Dashboard (Creator Side)
When a user decides to create a course, they switch to "Instructor Mode". This is a completely separate set of screens (often a separate dashboard).
* **Routes:** `/instructor` or `/teach`
* **Why keep it separate?** The mindset of an instructor is different. They need analytics, financial tools, and curriculum builders, which clutters the standard learner navigation.
* **Features:**
  * **Instructor Hub:** A list of courses they have created (Draft, In Review, Published).
  * **Curriculum Builder:** A drag-and-drop interface for creating Sections, Video items, Quizzes, and Assignments.
  * **Performance Analytics:** Dashboards showing enrollments, student completion rates, and average ratings.
  * **Communications Hub:** A centralized place for the instructor to reply to student Q&A threads across all their courses and send global announcements.
  * **Payouts/Monetization:** Tracking revenue if courses are paid.

### C. Global Super Admin Panel (Platform Side)
Because this is a public platform, Stunity central staff (Super Admins) must police the content to ensure quality and safety.
* **Routes:** `/super-admin/courses`
* **Features:**
  * **Course Moderation:** Approving or rejecting courses before they go live on the global marketplace.
  * **Dispute Resolution:** Handling reported courses (copyright strikes, inappropriate content).
  * **Global Analytics:** Overall platform health, top-performing courses, and instructor payouts.

---

## 2. Navigating Between Learner and Instructor Modes

### How Udemy/Coursera Does It
Most successful platforms offer a clean "Context Switch" in the top navigation bar or user dropdown.

1. **Default State:** Everyone logs in as a Learner.
2. **The Switch:** In the top header or user profile menu, there is a button: **"Instructor"** or **"Teach on Stunity"**.
3. **The Transition:** Clicking this takes the user to the `/instructor` dashboard. The main navigation completely changes. Instead of "Clubs, Feed, Learn", the top nav becomes "Courses, Communication, Performance, Tools".
4. **Switching Back:** There is a persistent **"Student"** or **"Return to Learning"** button to toggle back to the consumer view.

This exact paradigm should be implemented in Stunity for both Web and Mobile. On Mobile, "Instructor Mode" is often a dedicated tab or an entirely separate settings flow to keep the main app simple for students.

---

## 3. Database Architecture Required for this Paradigm

To support this enterprise-level separation, the database must cleanly distinguish between **Structure** (what the instructor builds) and **Progress** (what the learner achieves).

### Content Structure (Instructor Owned)
* **`Course`:** The top-level container (Title, Price, Instructor ID).
* **`CourseSection` / `Module`:** The folders within the course (e.g., "Section 1: Data Types").
* **`CourseItem`:** The actual content within a section. Uses a polymorphic type (`VIDEO`, `ARTICLE`, `QUIZ`, `ASSIGNMENT`).

### User Engagement (Learner Owned)
* **`Enrollment`:** Created when a student joins. Links `User` to `Course` and tracks overall percentage.
* **`ItemProgress`:** Tracks if a student has completed a specific `CourseItem`, how much video they watched, or their quiz score.
* **`QAThread`:** A question asked by a learner on a specific `CourseItem`. Instructors (or other learners) can reply to these threads.

---

## 4. Implementation Status (Updated April 14, 2026)

1.  **Instructor Layout & Context Switch**: Fully implemented in both Web and Mobile.
2.  **Learn Service Extraction**: Extracted to port 3018, decoupling from `feed-service`.
3.  **3-Tier Hierarchy**: Database schema and APIs migrated to `Section -> Item` model.
4.  **Instructor Dashboard**: Analytics, student growth charts, and course management are live.
