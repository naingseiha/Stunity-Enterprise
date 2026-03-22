import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function main() {
    const students = require('./scripts/migrate-v1-to-v2/data/export-2026-03-01T13-39-08/students.json');
    const classes = require('./scripts/migrate-v1-to-v2/data/export-2026-03-01T13-39-08/classes.json');

    const s = students.find((x: any) => x.id === 'cmiqd09q3002pa5ff7x8wmzo2');
    if (!s) return console.log("Student not found");

    const cls = classes.find((c: any) => c.id === s.classId);
    console.log("Found student:", s.id, "Class:", cls?.name, "AY:", cls?.academicYear);

    try {
        const studentDb = await prisma.student.findUnique({ where: { id: s.id } });
        if (!studentDb) return console.log("Student missing in DB");

        const classDb = await prisma.class.findUnique({ where: { id: s.classId } });
        if (!classDb) return console.log("Class missing in DB");

        const ayDb = await prisma.academicYear.findFirst({ where: { name: cls?.academicYear || '2024-2025' } });
        if (!ayDb) return console.log("AY missing in DB");

        console.log("Attempting upsert...");
        await prisma.studentClass.upsert({
            where: {
                studentId_classId_academicYearId: {
                    studentId: studentDb.id,
                    classId: classDb.id,
                    academicYearId: ayDb.id
                }
            },
            create: {
                studentId: studentDb.id,
                classId: classDb.id,
                academicYearId: ayDb.id,
                status: 'ACTIVE'
            },
            update: {},
        });
        console.log("SUCCESS");
    } catch (err: any) {
        if (err.code === 'P2003') console.log("FOREIGN KEY ERROR:", err.meta?.field_name);
        else console.log("ERROR:\n", err.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
