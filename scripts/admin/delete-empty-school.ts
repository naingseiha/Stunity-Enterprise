import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find all schools
    const schools = await prisma.school.findMany({
        include: {
            _count: {
                select: { classes: true, students: true }
            }
        }
    });

    console.log("Found schools:");
    for (const school of schools) {
        console.log(`- ${school.name} (ID: ${school.id}) | Classes: ${school._count.classes} | Students: ${school._count.students}`);
    }

    // Find the exact one with 0 classes and 0 students
    const emptySchools = schools.filter(s => s._count.classes === 0 && s._count.students === 0);

    if (emptySchools.length === 0) {
        console.log("No empty schools found to delete.");
        return;
    }

    for (const emptySchool of emptySchools) {
        console.log(`\nDeleting empty school: ${emptySchool.id}...`);

        await prisma.user.deleteMany({ where: { schoolId: emptySchool.id } });
        await prisma.teacher.deleteMany({ where: { schoolId: emptySchool.id } });

        // Prisma Cascade Delete will handle associated AcademicYears and GradingScales
        await prisma.school.delete({ where: { id: emptySchool.id } });
        console.log(`✅ Deleted successfully.`);
    }

}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
