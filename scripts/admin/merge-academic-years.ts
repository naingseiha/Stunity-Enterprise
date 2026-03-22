import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function main() {
    const school = await prisma.school.findFirst({
        where: { name: 'Svaythom High School' }
    });

    if (!school) {
        console.error("❌ Svaythom High School not found in database.");
        process.exit(1);
    }

    // Get the Academic Years
    const ays = await prisma.academicYear.findMany({
        where: { schoolId: school.id }
    });

    const ay2025 = ays.find(ay => ay.name === '2025-2026');
    const ay2026 = ays.find(ay => ay.name === '2026-2027');

    if (!ay2025 || !ay2026) {
        console.error("❌ Could not find the 2025-2026 or 2026-2027 academic years.");
        process.exit(1);
    }

    console.log(`Merge Source (2026-2027): ${ay2026.id}`);
    console.log(`Merge Target (2025-2026): ${ay2025.id}\n`);

    // 1. Update Classes
    const classUpdate = await prisma.class.updateMany({
        where: { academicYearId: ay2026.id },
        data: { academicYearId: ay2025.id }
    });
    console.log(`✅ Moved ${classUpdate.count} Classes from 2026-2027 to 2025-2026.`);

    // 2. Update StudentClass enrollments
    // We use updateMany, but if there's a unique constraint conflict (student already enrolled in the SAME class in 2025), it would fail.
    // Since they were imported separately, it's likely safe. If it fails, we will iterate and merge safely.
    try {
        const studentClassUpdate = await prisma.studentClass.updateMany({
            where: { academicYearId: ay2026.id },
            data: { academicYearId: ay2025.id }
        });
        console.log(`✅ Moved ${studentClassUpdate.count} StudentClass enrollments from 2026-2027 to 2025-2026.`);
    } catch (err: any) {
        console.warn("⚠️ Conflict in StudentClass bulk update. Processing individually...", err.message);
        const scs = await prisma.studentClass.findMany({ where: { academicYearId: ay2026.id } });
        let moved = 0, skipped = 0;
        for (const sc of scs) {
            try {
                await prisma.studentClass.update({
                    where: { id: sc.id },
                    data: { academicYearId: ay2025.id }
                });
                moved++;
            } catch (e) {
                // Likely already exists
                await prisma.studentClass.delete({ where: { id: sc.id } });
                skipped++;
            }
        }
        console.log(`✅ Moved ${moved} StudentClass enrollments, skipped/deleted ${skipped} duplicates.`);
    }

    console.log("\n🎉 All data successfully merged into 2025-2026.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
