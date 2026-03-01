import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function upsertInBatches<T>(
    items: T[],
    batchSize: number,
    processFn: (item: T) => Promise<void>
) {
    for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        await Promise.all(chunk.map((item) => processFn(item)));
    }
}

async function main() {
    const IMPORT_DIR = './scripts/migrate-v1-to-v2/data/export-2026-03-01T13-39-08';
    const students = require(path.resolve(IMPORT_DIR, 'students.json'));
    const classes = require(path.resolve(IMPORT_DIR, 'classes.json'));

    const schoolId = 'cmm7wisni0000csdh7ky9b5j1'; // Fixed test school ID

    const idMap: Record<string, Record<string, string>> = {
        academicYear: {},
        class: {},
        student: {}
    };

    try {
        // Populate idMap manually based on DB state or just trust that IDs are preserved
        const dbAys = await prisma.academicYear.findMany();
        for (const ay of dbAys) idMap.academicYear[ay.name] = ay.id;

        const dbClasses = await prisma.class.findMany();
        for (const c of dbClasses) idMap.class[c.id] = c.id;

        // Assume all students exist with the same ID
        for (const s of students) idMap.student[s.id] = s.id;

        console.log("Starting batch upsert...");
        let scCreated = 0;
        let failedCount = 0;

        await upsertInBatches(students, 100, async (s) => {
            if (!s.classId) return;
            const studentId = idMap.student[s.id];
            const classId = idMap.class[s.classId];
            const cls = classes.find((c: any) => c.id === s.classId);
            const ayId = cls ? idMap.academicYear[cls.academicYear || '2024-2025'] : null;
            if (!studentId || !classId || !ayId) { return; }
            try {
                await prisma.studentClass.upsert({
                    where: { studentId_classId_academicYearId: { studentId, classId, academicYearId: ayId } },
                    create: { studentId, classId, academicYearId: ayId, status: 'ACTIVE' },
                    update: {},
                });
                scCreated++;
            } catch (err: any) {
                if (s.id === 'cmiqd09q3002pa5ff7x8wmzo2' || failedCount === 0) {
                    console.log(`\nERROR for student ${s.id}:`);
                    console.log(err.message);
                }
                failedCount++;
            }
        });

        console.log(`\nDone. Created ${scCreated}, Failed ${failedCount}`);

    } catch (err: any) {
        console.log("FATAL ERROR:\n", err.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
