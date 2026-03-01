/**
 * DB Reset / Cleanup Script
 *
 * Safely removes ALL test/seed data from V2, leaving the database clean
 * and ready for real production data (V1 migration).
 *
 * Usage:
 *   # Preview what will be deleted (SAFE – no writes):
 *   npx tsx scripts/reset-to-clean.ts
 *
 *   # Actually delete everything:
 *   npx tsx scripts/reset-to-clean.ts --confirm
 *
 *   # Delete + create a fresh super admin user:
 *   npx tsx scripts/reset-to-clean.ts --confirm \
 *     --create-super-admin \
 *     --email admin@stunity.com \
 *     --password SecurePass123!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Arg parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const CREATE_SUPER_ADMIN = args.includes('--create-super-admin');
const WIPE_SUPER_ADMIN = args.includes('--wipe-super-admin');

function getArg(flag: string): string | undefined {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
}

const SA_EMAIL = getArg('--email') || process.env.SUPER_ADMIN_EMAIL;
const SA_PASSWORD = getArg('--password') || process.env.SUPER_ADMIN_PASSWORD;
const SA_FIRST = getArg('--first') || process.env.SUPER_ADMIN_FIRST || 'Platform';
const SA_LAST = getArg('--last') || process.env.SUPER_ADMIN_LAST || 'Admin';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GREEN = (s: string) => `\x1b[32m${s}\x1b[0m`;
const RED = (s: string) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s: string) => `\x1b[33m${s}\x1b[0m`;
const BOLD = (s: string) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;

async function safeCount(model: string, fn: () => Promise<number>): Promise<{ model: string; count: number }> {
    try {
        return { model, count: await fn() };
    } catch {
        return { model, count: -1 };
    }
}

async function safeDel(label: string, fn: () => Promise<{ count: number } | any>): Promise<number> {
    try {
        const res = await fn();
        const count = typeof res?.count === 'number' ? res.count : 0;
        console.log(`  ${GREEN('✓')} ${label.padEnd(38)} ${String(count).padStart(5)} deleted`);
        return count;
    } catch (e: any) {
        console.log(`  ${YELLOW('⚠')} ${label.padEnd(38)} ${DIM('skipped – ' + (e?.message?.slice(0, 60) ?? 'unknown'))}`);
        return 0;
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log(BOLD('┌──────────────────────────────────────────────────────┐'));
    if (CONFIRM) {
        console.log(BOLD('│  Stunity DB Reset   ⚠️  LIVE – WILL DELETE DATA        │'));
    } else {
        console.log(BOLD('│  Stunity DB Reset   🔍 PREVIEW (no writes)            │'));
    }
    console.log(BOLD('└──────────────────────────────────────────────────────┘'));
    console.log('');

    // ── Count preview ──────────────────────────────────────────────────────────
    const counts = await Promise.all([
        safeCount('Schools', () => prisma.school.count()),
        safeCount('Users (non-super-admin)', () => prisma.user.count({ where: { isSuperAdmin: false } })),
        safeCount('Super admin users', () => prisma.user.count({ where: { isSuperAdmin: true } })),
        safeCount('Students', () => prisma.student.count()),
        safeCount('Teachers', () => prisma.teacher.count()),
        safeCount('Parents', () => prisma.parent.count()),
        safeCount('Classes', () => prisma.class.count()),
        safeCount('AcademicYears', () => prisma.academicYear.count()),
        safeCount('Subjects', () => prisma.subject.count()),
        safeCount('Grades', () => prisma.grade.count()),
        safeCount('Attendance', () => prisma.attendance.count()),
        safeCount('Posts', () => prisma.post.count()),
        safeCount('Feature Flags', () => prisma.featureFlag.count()),
        safeCount('Platform Announcements', () => prisma.platformAnnouncement.count()),
    ]);

    console.log('  Current database contents:');
    for (const { model, count } of counts) {
        const color = count > 0 ? (model.includes('super') ? GREEN : YELLOW) : DIM;
        console.log(`    ${color(model.padEnd(38))} ${String(count === -1 ? 'N/A' : count).padStart(6)}`);
    }
    console.log('');

    const superAdminCount = counts.find((c) => c.model === 'Super admin users')?.count ?? 0;

    if (!CONFIRM) {
        console.log(YELLOW('  ── DRY RUN ── No data was changed.'));
        console.log('');
        console.log('  To delete everything, re-run with --confirm:');
        console.log('    npx tsx scripts/reset-to-clean.ts --confirm');
        console.log('');
        console.log('  To delete + create fresh super admin:');
        console.log('    npx tsx scripts/reset-to-clean.ts --confirm --create-super-admin \\');
        console.log('      --email admin@stunity.com --password SecurePass123!');
        if (superAdminCount > 0) {
            console.log('');
            console.log(GREEN(`  ✓  ${superAdminCount} super admin user(s) will be PRESERVED`));
            console.log(DIM('     (use --wipe-super-admin to also delete them)'));
        }
        console.log('');
        return;
    }

    // ── Actual deletion (FK-safe order) ───────────────────────────────────────
    console.log(RED('  ⚠️  Starting deletion...'));
    console.log('');

    let totalDeleted = 0;

    // 1. Deep leaf data – grades / attendance / social interactions
    totalDeleted += await safeDel('Grades', () => prisma.grade.deleteMany());
    totalDeleted += await safeDel('GradeConfirmations', () => prisma.gradeConfirmation.deleteMany());
    totalDeleted += await safeDel('Attendance', () => prisma.attendance.deleteMany());
    totalDeleted += await safeDel('StudentMonthlySummaries', () => prisma.studentMonthlySummary.deleteMany());
    totalDeleted += await safeDel('StudentClass enrollments', () => prisma.studentClass.deleteMany());
    totalDeleted += await safeDel('StudentParent links', () => prisma.studentParent.deleteMany());
    totalDeleted += await safeDel('SubjectTeacher links', () => prisma.subjectTeacher.deleteMany());
    totalDeleted += await safeDel('TeacherClass links', () => prisma.teacherClass.deleteMany());
    totalDeleted += await safeDel('TeacherAttendance', () => prisma.teacherAttendance.deleteMany());

    // 2. Social / feed data
    totalDeleted += await safeDel('Post reactions (likes)', () => prisma.like.deleteMany());
    totalDeleted += await safeDel('Comment reactions', () => prisma.commentReaction.deleteMany());
    totalDeleted += await safeDel('Comments', () => prisma.comment.deleteMany());
    totalDeleted += await safeDel('Bookmarks', () => prisma.bookmark.deleteMany());
    totalDeleted += await safeDel('Post reports', () => prisma.postReport.deleteMany());
    totalDeleted += await safeDel('Post views', () => prisma.postView.deleteMany());
    totalDeleted += await safeDel('Posts', () => prisma.post.deleteMany());
    totalDeleted += await safeDel('Story reactions', () => prisma.storyReaction.deleteMany());
    totalDeleted += await safeDel('Story views', () => prisma.storyView.deleteMany());
    totalDeleted += await safeDel('Stories', () => prisma.story.deleteMany());
    totalDeleted += await safeDel('Poll votes', () => prisma.pollVote.deleteMany());
    totalDeleted += await safeDel('Poll options', () => prisma.pollOption.deleteMany());

    // 3. Learning / clubs
    totalDeleted += await safeDel('Quiz attempt records', () => prisma.quizAttemptRecord.deleteMany());
    totalDeleted += await safeDel('Quiz attempts', () => prisma.quizAttempt.deleteMany());
    totalDeleted += await safeDel('Quiz questions', () => prisma.quizQuestion.deleteMany());
    totalDeleted += await safeDel('Quizzes', () => prisma.quiz.deleteMany());
    totalDeleted += await safeDel('Course reviews', () => prisma.courseReview.deleteMany());
    totalDeleted += await safeDel('Lesson progress', () => prisma.lessonProgress.deleteMany());
    totalDeleted += await safeDel('Lesson resources', () => prisma.lessonResource.deleteMany());
    totalDeleted += await safeDel('Lessons', () => prisma.lesson.deleteMany());
    totalDeleted += await safeDel('Enrolled courses', () => prisma.enrollment.deleteMany());
    totalDeleted += await safeDel('Courses', () => prisma.course.deleteMany());
    totalDeleted += await safeDel('Club members', () => prisma.clubMember.deleteMany());
    totalDeleted += await safeDel('Club sessions', () => prisma.clubSession.deleteMany());
    totalDeleted += await safeDel('Club announcements', () => prisma.clubAnnouncement.deleteMany());
    totalDeleted += await safeDel('Study clubs', () => prisma.studyClub.deleteMany());

    // 4. Social graph
    totalDeleted += await safeDel('Follows', () => prisma.follow.deleteMany());
    totalDeleted += await safeDel('Notifications', () => prisma.notification.deleteMany());
    totalDeleted += await safeDel('Conversations', () => prisma.conversation.deleteMany());
    totalDeleted += await safeDel('DM messages', () => prisma.directMessage.deleteMany());

    // 5. Credentials / claim codes
    totalDeleted += await safeDel('ClaimCodes', () => prisma.claimCode.deleteMany());
    totalDeleted += await safeDel('Audit logs (school)', () => prisma.auditLog.deleteMany());

    // 6. School entities
    totalDeleted += await safeDel('Students', () => prisma.student.deleteMany());
    totalDeleted += await safeDel('Teachers', () => prisma.teacher.deleteMany());
    totalDeleted += await safeDel('Parents', () => prisma.parent.deleteMany());
    totalDeleted += await safeDel('Classes', () => prisma.class.deleteMany());
    totalDeleted += await safeDel('GradeRanges', () => prisma.gradeRange.deleteMany());
    totalDeleted += await safeDel('GradingScales', () => prisma.gradingScale.deleteMany());
    totalDeleted += await safeDel('ExamTypes', () => prisma.examType.deleteMany());
    totalDeleted += await safeDel('Academic terms', () => prisma.academicTerm.deleteMany());
    totalDeleted += await safeDel('Calendar events', () => prisma.calendarEvent.deleteMany());
    totalDeleted += await safeDel('Academic calendars', () => prisma.academicCalendar.deleteMany());
    totalDeleted += await safeDel('Academic years', () => prisma.academicYear.deleteMany());
    totalDeleted += await safeDel('Subjects', () => prisma.subject.deleteMany());
    totalDeleted += await safeDel('OnboardingChecklists', () => prisma.onboardingChecklist.deleteMany());
    totalDeleted += await safeDel('SchoolSettings', () => prisma.schoolSettings.deleteMany());
    totalDeleted += await safeDel('Timetable entries', () => prisma.timetableEntry.deleteMany());
    totalDeleted += await safeDel('Timetable templates', () => prisma.timetableTemplate.deleteMany());

    // 7. Users
    const userWhere = WIPE_SUPER_ADMIN ? {} : { isSuperAdmin: false };
    totalDeleted += await safeDel(
        `Users (${WIPE_SUPER_ADMIN ? 'all' : 'non-super-admin'})`,
        () => prisma.user.deleteMany({ where: userWhere })
    );

    // 8. Schools
    totalDeleted += await safeDel('Schools', () => prisma.school.deleteMany());

    // 9. Platform config
    totalDeleted += await safeDel('Feature flags', () => prisma.featureFlag.deleteMany());
    totalDeleted += await safeDel('Platform announcements', () => prisma.platformAnnouncement.deleteMany());
    totalDeleted += await safeDel('Platform audit logs', () => prisma.platformAuditLog.deleteMany());

    console.log('');
    console.log(`  ${GREEN(BOLD('Database cleared.'))} ${totalDeleted} rows deleted total.`);
    console.log('');

    // ── Create super admin ─────────────────────────────────────────────────────
    if (CREATE_SUPER_ADMIN) {
        if (!SA_EMAIL || !SA_PASSWORD) {
            console.log(RED('  ❌  --create-super-admin requires --email and --password'));
            process.exit(1);
        }
        const { hash } = await import('bcryptjs');
        const hashedPassword = await hash(SA_PASSWORD, 12);

        const existing = await prisma.user.findFirst({ where: { email: SA_EMAIL } });
        if (existing) {
            await prisma.user.update({
                where: { id: existing.id },
                data: { isSuperAdmin: true, password: hashedPassword, isActive: true },
            });
            console.log(GREEN(`  ✓  Updated existing user to super admin: ${SA_EMAIL}`));
        } else {
            const sa = await prisma.user.create({
                data: {
                    firstName: SA_FIRST,
                    lastName: SA_LAST,
                    email: SA_EMAIL,
                    password: hashedPassword,
                    role: 'ADMIN',   // closest valid enum value; isSuperAdmin flag is the authority
                    isSuperAdmin: true,
                    isActive: true,
                    isDefaultPassword: false,
                    schoolId: null,
                },
            });
            console.log(GREEN(`  ✓  Super admin created: ${sa.email} [${sa.id}]`));
        }
        console.log('');
        console.log('  Login at: /[locale]/auth/login → /[locale]/super-admin');
        console.log('');
    } else {
        const remaining = await prisma.user.count({ where: { isSuperAdmin: true } });
        if (remaining > 0) {
            console.log(GREEN(`  ✓  ${remaining} super admin user(s) preserved.`));
        } else {
            console.log(YELLOW('  ⚠️  No super admin users remain. Create one with:'));
            console.log('      npx tsx scripts/seed-super-admin.ts --create \\');
            console.log('        --email admin@stunity.com --password SecurePass123!');
        }
        console.log('');
    }

    console.log('  Next steps:');
    console.log('  1. Apply customFields migration SQL (if not done)');
    console.log('  2. Export V1 data:  npm run migrate:v1-export');
    console.log('  3. Dry run:         IMPORT_DIR=... DRY_RUN=true npm run migrate:v1-import');
    console.log('  4. Live import:     IMPORT_DIR=... CREATE_SCHOOL=true npm run migrate:v1-import');
    console.log('');
}

main()
    .catch((e) => {
        console.error(RED(`\n❌  Reset failed: ${e.message}`));
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
