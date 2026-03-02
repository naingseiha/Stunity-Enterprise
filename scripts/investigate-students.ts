import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const classId = 'cmiq7zzlk000rq0ja6s7xwhj0';

    // 1. Check Class
    const classObj = await prisma.class.findUnique({
        where: { id: classId },
        include: {
            _count: {
                select: { studentClasses: true }
            }
        }
    });

    console.log('Class:', classObj);

    // 2. Check Student Classes for this class
    const studentClasses = await prisma.studentClass.findMany({
        where: { classId }
    });

    console.log(`Found ${studentClasses.length} student classes for this class.`);
    for (const sc of studentClasses.slice(0, 5)) {
        console.log(`- sc: id=${sc.id}, studentId=${sc.studentId}, status=${sc.status}, academicYearId=${sc.academicYearId}`);
    }

    // 3. Count total active vs non-active worldwide
    const totalSC = await prisma.studentClass.count();
    const totalActiveSC = await prisma.studentClass.count({ where: { status: 'ACTIVE' } });

    console.log(`Total StudentClasses globally: ${totalSC} (${totalActiveSC} ACTIVE)`);
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
