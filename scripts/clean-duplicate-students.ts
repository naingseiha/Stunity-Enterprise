import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting cleanup of duplicate StudentClass records...');

    // 1. Find all active student enrollments
    const studentClasses = await prisma.studentClass.findMany({
        where: {
            status: 'ACTIVE',
        },
        orderBy: {
            enrolledAt: 'asc', // Order by enrolledAt so we keep the oldest strictly or handle duplicates optimally. Since we're keeping most recent, we'll swap to 'desc'.
        },
    });

    console.log(`📊 Found ${studentClasses.length} total active enrollments.`);

    const enrollmentsMap = new Map();
    const duplicateIdsToDelete: string[] = [];

    for (const sc of studentClasses) {
        // A student can only be enrolled in a class ONCE
        const uniqueKey = `${sc.studentId}-${sc.classId}`;

        if (!enrollmentsMap.has(uniqueKey)) {
            // First time we see this student-class combination, keep it
            enrollmentsMap.set(uniqueKey, sc);
        } else {
            // We already have an active enrollment for this student in this class!
            // This is a duplicate. We should delete this one (since it's not the first one we saw).
            const existing = enrollmentsMap.get(uniqueKey);

            // Keep the most recent one instead? (The one with the latest enrolledAt)
            if (new Date(sc.enrolledAt) > new Date(existing.enrolledAt)) {
                // The current one `sc` is MORE recent than `existing`.
                // So we delete `existing` and keep `sc`
                duplicateIdsToDelete.push(existing.id);
                enrollmentsMap.set(uniqueKey, sc);
            } else {
                // `existing` is more recent or equal. Delete `sc`
                duplicateIdsToDelete.push(sc.id);
            }
        }
    }

    console.log(`🔍 Found ${duplicateIdsToDelete.length} duplicate active enrollments to delete.`);

    if (duplicateIdsToDelete.length > 0) {
        // 2. Delete the duplicates
        const result = await prisma.studentClass.deleteMany({
            where: {
                id: { in: duplicateIdsToDelete }
            }
        });
        console.log(`✅ Deleted ${result.count} duplicate enrollments.`);
    }

    // 3. Optional: cleanup DROPPED status records if they're also duplicated unnecessarily.
    // Actually, we'll just leave DROPPED as historical records unless they cause issues.

    console.log('🎉 Cleanup complete!');
}

main()
    .catch((e) => {
        console.error('❌ Error during cleanup:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
