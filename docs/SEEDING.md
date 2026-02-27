# Test Data Seeding Guide

This guide explains how to seed the database with comprehensive test data for the school management and e-learning features.

## Quick Start (Full Reset + All Test Data)

```bash
# 1. Reset database and run base seed (schools, users, academic years, classes, teachers, students)
cd packages/database && npx prisma db push --force-reset && npx prisma db seed && cd ../..

# 2. Add additional test data (more academic years, teachers, students)
npm run seed:test-data

# 3. Add school management data (subjects, grades, attendance, timetable)
npm run seed:school-management
```

**Or run all steps in one command:**
```bash
npm run seed:all
```
*(Note: `seed:all` assumes the database is already migrated. For a fresh start, run step 1 first.)*

---

## What Each Script Seeds

### Base Seed (`packages/database` → `npx prisma db seed`)

- **Schools**: Test High School, Stunity Academy
- **Users**: Admin (john.doe@testhighschool.edu / SecurePass123!)
- **Academic Years**: 2024-2025 (ENDED), 2025-2026 (ACTIVE), 2026-2027 (PLANNING)
- **Classes**: Grades 7–10 across 3 years
- **Teachers**: 4 teachers with Khmer names
- **Students**: 105 students in 2024-2025, enrolled via StudentClass
- **TeacherClass** and **StudentClass** assignments

### Test Data (`npm run seed:test-data`)

Requires **Test High School** to exist (from base seed).

- **Academic Years**: 2024-2025 through 2027-2028
- **Teachers**: 8 teachers
- **Classes**: Grade 10A/B, 11A/B/C, 12A/B for each year
- **Students**: ~47 students in current year (2025-2026) with StudentClass enrollments

### School Management (`npm run seed:school-management`)

Requires **Test High School** and a **current academic year** (from base seed + test data).

- **Subjects**: Cambodian curriculum (Khmer, Math, English, Physics, Chemistry, Biology, History, Geography, Civics, PE, Computer Science) for grades 7–12
- **Periods**: Default school schedule (7:00 AM–12:00 PM, 6 teaching periods + breaks)
- **SubjectTeacher**: Assignments linking teachers to subjects
- **Grades**: Sample grade entries for current month
- **Attendance**: Sample attendance records (Present/Absent) for today
- **TimetableEntry**: Sample weekly schedule for 3 classes

---

## Login Credentials

| Email | Password |
|-------|----------|
| john.doe@testhighschool.edu | SecurePass123! |

---

### Super Admin (`npm run seed:super-admin [email]`)

Promotes an existing user to Super Admin.

```bash
# Promote default admin (admin@stunity.com)
npm run seed:super-admin

# Or specify an email
npx tsx scripts/seed-super-admin.ts john.doe@testhighschool.edu
```

After seeding, log in with the promoted user to access the Super Admin dashboard at `/super-admin`.

---

## Features to Test After Seeding

| Feature | Path | Test Data |
|---------|------|-----------|
| Students | /students | 105+ students across classes |
| Teachers | /teachers | 4–8 teachers |
| Classes | /classes | Classes for grades 7–12 |
| Subjects | /settings/subjects | 11 subjects × 6 grades |
| Grade Entry | /grades/entry | Pre-filled sample grades |
| Attendance | /attendance/mark | Sample attendance for today |
| Timetable | /timetable | Sample schedule for 3 classes |
| Academic Years | /settings/academic-years | 4 years (2024–2028) |
| Student Promotion | Settings → Academic Years → Promote | Students in 2024-2025 ready for promotion |
| Super Admin | /super-admin | Run `npm run seed:super-admin john.doe@testhighschool.edu` first |

---

## Troubleshooting

**"Test High School not found"**  
Run the base seed first: `cd packages/database && npx prisma db seed`

**"No current academic year found"**  
Run `npm run seed:test-data` to add academic years and set one as current.

**Database connection errors**  
Ensure `DATABASE_URL` is set in `.env` or `packages/database/.env`.
