import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function main() {
    const IMPORT_DIR = './scripts/migrate-v1-to-v2/data/export-2026-03-01T13-39-08';
    const students = require(path.resolve(IMPORT_DIR, 'students.json'));

    const school = await prisma.school.findFirst({ where: { name: 'Svaythom High School' } });
    if (!school) return console.log("School not found");

    const ay2025 = await prisma.academicYear.findFirst({ where: { schoolId: school.id, name: '2025-2026' } });
    if (!ay2025) return console.log("AY 2025-2026 not found");

    const dbClasses = await prisma.class.findMany({ where: { schoolId: school.id } });
    const dbStudents = await prisma.student.findMany({ where: { schoolId: school.id } });

    const classIdMap = new Map(dbClasses.map(c => [c.id, c.id]));
    const studentIdMap = new Map(dbStudents.map(s => [s.id, s.id]));

    const dataToInsert: any[] = [];

    for (const s of students) {
        if (!s.classId) continue;
        const studentId = studentIdMap.get(s.id);
        const classId = classIdMap.get(s.classId);
        if (!studentId || !classId) continue;

        dataToInsert.push({
            studentId,
            classId,
            academicYearId: ay2025.id,
            status: 'ACTIVE'
        });
    }

    console.log(`Prepared ${dataToInsert.length} distinct records from JSON.`);

    const result = await prisma.studentClass.createMany({
        data: dataToInsert,
        skipDuplicates: true,
    });

    console.log(`✅ Successfully bulk-inserted ${result.count} new student enrollments.`);
}

main().finally(() => prisma.$disconnect());
