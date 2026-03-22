import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
    try {
        const today = new Date();
        // Start of today in local time (7:00 AM UTC = 2:00 PM Local)
        // The user's metadata says: 2026-03-03T12:46:04+07:00
        // So today is March 3rd.

        const start = new Date("2026-03-03T00:00:00+07:00");
        const end = new Date("2026-03-03T23:59:59+07:00");

        console.log(`Checking from: ${start.toISOString()} to ${end.toISOString()}`);

        const teacherAttendance = await prisma.teacherAttendance.findMany({
            where: {
                date: { gte: start, lte: end }
            },
            include: {
                teacher: {
                    select: {
                        id: true,
                        schoolId: true,
                        user: { select: { email: true } }
                    }
                }
            }
        });

        console.log(`Found ${teacherAttendance.length} teacher attendance records for today.`);

        teacherAttendance.forEach(record => {
            console.log(`- Teacher: ${record.teacher.user.email} (School: ${record.teacher.schoolId})`);
            console.log(`  Status: ${record.status}, Date: ${record.date.toISOString()}, TimeIn: ${record.timeIn?.toISOString()}`);
        });

        const studentAttendance = await prisma.attendance.findMany({
            where: {
                date: { gte: start, lte: end }
            },
            include: {
                student: { select: { schoolId: true } }
            }
        });

        console.log(`Found ${studentAttendance.length} student attendance records for today.`);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
