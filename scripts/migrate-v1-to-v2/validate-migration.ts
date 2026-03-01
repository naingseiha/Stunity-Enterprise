/**
 * V1 → V2 Migration Validator
 *
 * Compares V1 export counts against actual V2 DB counts and checks data integrity.
 *
 * Usage:
 *   IMPORT_DIR=scripts/migrate-v1-to-v2/data/export-LATEST npx tsx scripts/migrate-v1-to-v2/validate-migration.ts
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = One or more checks failed
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const IMPORT_DIR = process.env.IMPORT_DIR || path.join(__dirname, 'data', 'export-latest');
const SCHOOL_ID = process.env.SCHOOL_ID || null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GREEN = (s: string | number) => `\x1b[32m${s}\x1b[0m`;
const RED = (s: string | number) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s: string | number) => `\x1b[33m${s}\x1b[0m`;
const BOLD = (s: string) => `\x1b[1m${s}\x1b[0m`;

type CheckResult = { name: string; passed: boolean; v1: number; v2: number; note?: string };

function row(r: CheckResult): string {
    const status = r.passed ? GREEN('✅ PASS') : RED('❌ FAIL');
    const diff = r.v2 - r.v1;
    const diffStr = diff === 0 ? '' : diff > 0 ? YELLOW(` (+${diff})`) : RED(` (${diff})`);
    return `  ${status}  ${r.name.padEnd(36)} V1: ${String(r.v1).padStart(6)}  V2: ${String(r.v2).padStart(6)}${diffStr}${r.note ? '  ' + YELLOW(`[${r.note}]`) : ''}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const startTime = Date.now();

    if (!fs.existsSync(IMPORT_DIR)) {
        console.error(`❌  Import directory not found: ${IMPORT_DIR}`);
        process.exit(1);
    }

    const metadataPath = path.join(IMPORT_DIR, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
        console.error(`❌  metadata.json not found in ${IMPORT_DIR}. Run export-v1-data.ts first.`);
        process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const v1Counts: Record<string, number> = metadata.tableCounts || {};

    const reportPath = path.join(IMPORT_DIR, 'migration-report.json');
    const migrationReport = fs.existsSync(reportPath)
        ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
        : null;

    const schoolId = SCHOOL_ID || migrationReport?.schoolId || null;

    console.log('');
    console.log(BOLD('┌─────────────────────────────────────────────────┐'));
    console.log(BOLD('│  V1 → V2 Migration Validator                    │'));
    console.log(BOLD('└─────────────────────────────────────────────────┘'));
    console.log('');
    console.log(`  Import dir  : ${IMPORT_DIR}`);
    console.log(`  School ID   : ${schoolId || '(not specified – querying all)'}`);
    console.log(`  V1 exported : ${metadata.exportedAt}`);
    if (migrationReport) {
        console.log(`  V2 imported : ${migrationReport.completedAt}`);
    }
    console.log('');

    const prisma = new PrismaClient();
    const checks: CheckResult[] = [];
    let failCount = 0;

    try {
        const schoolFilter = schoolId ? { schoolId } : {};

        // ── Count checks ─────────────────────────────────────────────────────────

        const v2Counts = {
            classes: await prisma.class.count({ where: schoolFilter }),
            subjects: await prisma.subject.count(),
            teachers: await prisma.teacher.count({ where: schoolFilter }),
            students: await prisma.student.count({ where: schoolFilter }),
            parents: await prisma.parent.count(),
            student_parents: await prisma.studentParent.count(),
            subject_teachers: await prisma.subjectTeacher.count(),
            teacher_classes: await prisma.teacherClass.count(),
            grades: await prisma.grade.count(),
            attendance: await prisma.attendance.count(),
            student_monthly_summaries: await prisma.studentMonthlySummary.count(),
            users: await prisma.user.count({ where: schoolId ? { schoolId } : {} }),
            grade_confirmations: await prisma.gradeConfirmation.count(),
        };

        const tableMap: Record<string, keyof typeof v2Counts> = {
            'classes': 'classes',
            'subjects': 'subjects',
            'teachers': 'teachers',
            'students': 'students',
            'parents': 'parents',
            'student_parents': 'student_parents',
            'subject_teachers': 'subject_teachers',
            'teacher_classes': 'teacher_classes',
            'grades': 'grades',
            'attendance': 'attendance',
            'student_monthly_summaries': 'student_monthly_summaries',
            'users': 'users',
            'grade_confirmations': 'grade_confirmations',
        };

        console.log(BOLD('  Row Count Checks:'));
        console.log('  ' + '─'.repeat(72));

        for (const [v1Table, v2Key] of Object.entries(tableMap)) {
            const v1Count = v1Counts[v1Table] ?? 0;
            const v2Count = v2Counts[v2Key] ?? 0;

            // V2 counts may be higher if pre-existing data; allow equal or more
            const passed = v2Count >= v1Count;
            const note = v1Count === 0 ? 'nothing to migrate' : v2Count > v1Count ? 'V2 has pre-existing data' : undefined;

            checks.push({ name: v1Table, passed, v1: v1Count, v2: v2Count, note });
            console.log(row({ name: v1Table, passed, v1: v1Count, v2: v2Count, note }));
            if (!passed) failCount++;
        }

        // ── Integrity checks ────────────────────────────────────────────────────
        console.log('');
        console.log(BOLD('  Integrity Checks:'));
        console.log('  ' + '─'.repeat(72));

        // Check: AcademicYears created
        const ayCount = await prisma.academicYear.count({ where: schoolId ? { schoolId } : {} });
        const ayPass = ayCount > 0;
        checks.push({ name: 'AcademicYears created', passed: ayPass, v1: 0, v2: ayCount, note: ayPass ? undefined : 'No academic years found' });
        console.log(row({ name: 'AcademicYears created', passed: ayPass, v1: 0, v2: ayCount }));
        if (!ayPass) failCount++;

        // Check: GradingScales created
        const gsCount = await prisma.gradingScale.count();
        const gsPass = gsCount > 0;
        checks.push({ name: 'GradingScales created', passed: gsPass, v1: 0, v2: gsCount });
        console.log(row({ name: 'GradingScales created', passed: gsPass, v1: 0, v2: gsCount }));
        if (!gsPass) failCount++;

        // Check: Students with customFields populated
        // Using $queryRawUnsafe because `customFields` may not yet be in the
        // generated Prisma client (schema migration pending after this edit).
        let studentsWithCF = 0;
        try {
            const sql = schoolId
                ? `SELECT COUNT(*)::int as count FROM students WHERE "customFields" IS NOT NULL AND "schoolId" = '${schoolId}'`
                : `SELECT COUNT(*)::int as count FROM students WHERE "customFields" IS NOT NULL`;
            const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
            studentsWithCF = Number(result[0]?.count ?? 0);
        } catch {
            // Column doesn't exist yet (run: prisma migrate dev)
            studentsWithCF = -1;
        }
        const totalStudents = await prisma.student.count({ where: schoolFilter });
        const cfPass = totalStudents === 0 || studentsWithCF > 0;
        const cfNote = totalStudents > 0 ? `${studentsWithCF}/${totalStudents} students have customFields` : undefined;
        checks.push({ name: 'Students customFields', passed: cfPass, v1: 0, v2: studentsWithCF, note: cfNote });
        console.log(row({ name: 'Students customFields', passed: cfPass, v1: 0, v2: studentsWithCF, note: cfNote }));
        if (!cfPass) failCount++;

        // Check: Student enrollments (StudentClass) match student count with classId
        const enrolledCount = await prisma.studentClass.count({
            where: schoolId
                ? { student: { schoolId } }
                : {},
        });
        const studentsWithClass = await prisma.student.count({
            where: { ...schoolFilter, NOT: { classId: null } },
        });
        const enrollPass = enrolledCount >= studentsWithClass;
        const enrollNote = `${enrolledCount} enrollments for ${studentsWithClass} enrolled students`;
        checks.push({ name: 'StudentClass enrollments', passed: enrollPass, v1: studentsWithClass, v2: enrolledCount, note: enrollNote });
        console.log(row({ name: 'StudentClass enrollments', passed: enrollPass, v1: studentsWithClass, v2: enrolledCount, note: enrollNote }));
        if (!enrollPass) failCount++;

        // Check: Orphaned grades (grades with no matching student)
        const orphanResult = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
            `SELECT COUNT(*)::int as count FROM grades g
           WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = g."studentId")`
        );
        const orphanGrades = Number(orphanResult[0]?.count ?? 0);
        const orphanPass = orphanGrades === 0;
        checks.push({ name: 'Orphaned grades', passed: orphanPass, v1: 0, v2: orphanGrades, note: orphanPass ? undefined : `${orphanGrades} grades have no student` });
        console.log(row({ name: 'Orphaned grades', passed: orphanPass, v1: 0, v2: orphanGrades }));
        if (!orphanPass) failCount++;

        // Check: School exists
        if (schoolId) {
            const school = await prisma.school.findUnique({ where: { id: schoolId } });
            const schoolPass = !!school;
            checks.push({ name: 'School exists in V2', passed: schoolPass, v1: 0, v2: schoolPass ? 1 : 0 });
            console.log(row({ name: 'School exists in V2', passed: schoolPass, v1: 0, v2: schoolPass ? 1 : 0, note: school?.name }));
            if (!schoolPass) failCount++;
        }

        // ── Summary ──────────────────────────────────────────────────────────────
        console.log('');
        console.log('  ' + '─'.repeat(72));
        const total = checks.length;
        const passed = total - failCount;

        if (failCount === 0) {
            console.log(GREEN(BOLD(`  ✅  All ${total} checks passed!`)));
        } else {
            console.log(RED(BOLD(`  ❌  ${failCount} of ${total} checks FAILED`)));
            console.log(YELLOW(`  ⚠️  Review failures above and re-run import if needed.`));
        }
        console.log(`  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        console.log('');

        // Write validation report
        const validationReport = {
            validatedAt: new Date().toISOString(),
            schoolId,
            passed,
            failed: failCount,
            total,
            checks,
        };
        const valReportPath = path.join(IMPORT_DIR, 'validation-report.json');
        fs.writeFileSync(valReportPath, JSON.stringify(validationReport, null, 2), 'utf8');
        console.log(`  Report: ${valReportPath}`);
        console.log('');

    } catch (err) {
        console.error('❌  Validation failed with error:', err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }

    process.exit(failCount > 0 ? 1 : 0);
}

main();
