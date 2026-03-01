import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2] || 'admin@svaythom.edu.kh';
    const password = process.argv[3] || 'SvaythomAdmin2026!';

    // Find the school
    const school = await prisma.school.findFirst({
        where: { name: 'Svaythom High School' }
    });

    if (!school) {
        console.error("❌ Svaythom High School not found in database.");
        process.exit(1);
    }

    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log(`ℹ️ User ${email} already exists.`);
        process.exit(0);
    }

    // Create school admin
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName: 'School',
            lastName: 'Admin',
            role: 'ADMIN',
            schoolId: school.id,
            isActive: true,
            isEmailVerified: true,
            permissions: ['ALL'], // Or whatever your schema uses for full school admin permissions
        }
    });

    console.log(`
✅ School Admin created successfully for ${school.name}!
    Name  : ${admin.firstName} ${admin.lastName}
    Email : ${admin.email}
    ID    : ${admin.id}
    Role  : ${admin.role}
    School: ${school.name}
  `);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
