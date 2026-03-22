import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const school = await prisma.school.findFirst({
        where: { name: 'Svaythom High School' }
    });

    if (!school) {
        console.error("School not found");
        process.exit(1);
    }

    // Find existing academic years
    const ays = await prisma.academicYear.findMany({
        where: { schoolId: school.id }
    });

    console.log("Current Academic Years:");
    ays.forEach(ay => console.log(`- ${ay.name} (isCurrent: ${ay.isCurrent}, status: ${ay.status})`));

    // The V1 import created 2024-2025 and 2025-2026.
    // The user wants:
    // 1. Rename 2024-2025 -> 2025-2026 (Make it Current & Active)
    // 2. Rename 2025-2026 -> 2026-2027 (Make it Planning & Not Current)

    // Find the exact ones
    const ay2024 = ays.find(ay => ay.name === '2024-2025');
    const ay2025 = ays.find(ay => ay.name === '2025-2026');

    if (ay2024 && ay2025) {
        console.log("\nShifting academic years forward...");

        // Move 2025 to 2026 first to avoid unique constraint collision
        await prisma.academicYear.update({
            where: { id: ay2025.id },
            data: {
                name: '2026-2027',
                isCurrent: false,
                status: 'PLANNING',
                startDate: new Date('2026-10-01'),
                endDate: new Date('2027-08-31')
            }
        });

        // Move 2024 to 2025 and make it ACTIVE
        await prisma.academicYear.update({
            where: { id: ay2024.id },
            data: {
                name: '2025-2026',
                isCurrent: true,
                status: 'ACTIVE',
                startDate: new Date('2025-10-01'),
                endDate: new Date('2026-08-31')
            }
        });

        console.log("✅ Academic Years successfully shifted forward!");
    } else {
        console.log("Could not find the expected 2024-2025 and 2025-2026 years to rename.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
