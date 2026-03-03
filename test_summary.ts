import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, eachDayOfInterval, isWeekend } from 'date-fns';

const prisma = new PrismaClient();

const calculateAttendancePercentage = (present: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
};

async function testSummary() {
    try {
        const schoolId = "cmm7yhssh0000lwcvao23npok";
        const startDate = "2026-03-03";
        const endDate = "2026-03-03";

        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));

        const dbStart = new Date(start);
        const dbEnd = new Date(end);

        console.log(`Testing School: ${schoolId}`);
        console.log(`Local Range: ${start.toISOString()} to ${end.toISOString()}`);
        console.log(`DB Search Range (with fallback): ${new Date(dbStart.getTime() - 24 * 60 * 60 * 1000).toISOString()} to ${dbEnd.toISOString()}`);

        const [attendanceRecords, teacherRecords] = await Promise.all([
            prisma.attendance.findMany({
                where: {
                    student: { schoolId },
                    date: { gte: dbStart, lte: dbEnd },
                },
            }),
            prisma.teacherAttendance.findMany({
                where: {
                    teacher: { schoolId },
                    OR: [
                        { date: { gte: dbStart, lte: dbEnd } },
                        { date: { gte: new Date(dbStart.getTime() - 24 * 60 * 60 * 1000), lte: dbEnd } }
                    ]
                },
            }),
        ]);

        console.log(`Found ${attendanceRecords.length} Student Records`);
        console.log(`Found ${teacherRecords.length} Teacher Records`);

        const studentCount = await prisma.student.count({ where: { schoolId } });
        const teacherCount = await prisma.teacher.count({ where: { schoolId } });
        const schoolDays = eachDayOfInterval({ start, end }).filter(date => !isWeekend(date)).length;

        console.log(`Student Count: ${studentCount}`);
        console.log(`Teacher Count: ${teacherCount}`);
        console.log(`School Days: ${schoolDays}`);

        const teacherTotals = {
            present: teacherRecords.filter(r => r.status === 'PRESENT').length,
            absent: teacherRecords.filter(r => r.status === 'ABSENT').length,
        };

        const attendanceRate = (schoolDays * 2 * studentCount) > 0
            ? calculateAttendancePercentage(
                attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length,
                schoolDays * 2 * studentCount
            )
            : 0;

        const teacherAttendanceRate = (schoolDays * teacherCount) > 0
            ? calculateAttendancePercentage(teacherTotals.present, schoolDays * teacherCount)
            : 0;

        console.log(`Attendance Rate: ${attendanceRate}%`);
        console.log(`Teacher Attendance Rate: ${teacherAttendanceRate}%`);

        // Check teacher summary specific logic
        const teacherId = teacherRecords[0]?.teacherId;
        if (teacherId) {
            console.log(`\nTesting Teacher Summary for: ${teacherId}`);
            // ... simulating GET /attendance/teacher/:teacherId/summary
            const teacherAttendances = await prisma.teacherAttendance.findMany({
                where: {
                    teacherId,
                    OR: [
                        { date: { gte: dbStart, lte: dbEnd } },
                        { date: { gte: new Date(dbStart.getTime() - 24 * 60 * 60 * 1000), lte: dbEnd } }
                    ]
                },
            });
            const staffTotals = {
                present: teacherAttendances.filter(r => r.status === 'PRESENT').length,
                absent: teacherAttendances.filter(r => r.status === 'ABSENT').length,
            };
            const personalAttendanceRate = schoolDays > 0
                ? calculateAttendancePercentage(staffTotals.present, schoolDays)
                : 0;
            console.log(`Personal Attendance Rate: ${personalAttendanceRate}%`);
        }

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testSummary();
