const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const latestUsers = await prisma.user.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, role: true, teacherId: true, schoolId: true }
    });
    console.log('--- RECENT 3 USERS ---');
    console.log(latestUsers);

    const latestTeachers = await prisma.teacher.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, schoolId: true }
    });
    console.log('\n--- RECENT 3 TEACHERS ---');
    console.log(latestTeachers);

    const claimCodes = await prisma.claimCode.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { claimedByUser: { select: { email: true, firstName: true } } }
    });
    console.log('\n--- RECENT 3 CLAIM CODES ---');
    console.log(claimCodes.map(c => ({
        code: c.code,
        status: c.claimedAt ? 'Claimed' : 'Active',
        claimedBy: c.claimedByUser?.email || c.claimedByUser?.firstName || 'Unknown User'
    })));
}
check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
