import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

function safeDate(dateStr: any): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

async function main() {
    const IMPORT_DIR = './scripts/migrate-v1-to-v2/data/export-2026-03-01T13-39-08';
    const teachers = require(path.resolve(IMPORT_DIR, 'teachers.json'));

    const school = await prisma.school.findFirst({ where: { name: 'Svaythom High School' } });
    if (!school) return console.log("School not found");

    let created = 0;

    for (const t of teachers) {
        try {
            // Use upsert to only insert the 9 failed ones (or update existing)
            await prisma.teacher.upsert({
                where: { id: t.id },
                update: {
                    firstName: t.firstName || 'Unknown',
                    lastName: t.lastName || 'Teacher',
                    gender: (t.gender === 'M' || t.gender === 'MALE' ? 'MALE' : t.gender === 'F' || t.gender === 'FEMALE' ? 'FEMALE' : 'OTHER') as any,
                    email: t.email || null,
                    phone: t.phoneNumber || t.phone || null,
                    dateOfBirth: safeDate(t.dateOfBirth),
                    hireDate: safeDate(t.hireDate) || new Date().toISOString(),
                    customFields: {
                        regional: {
                            khmerName: t.khmerName || null,
                            englishName: t.englishName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || null,
                            position: t.position || 'Teacher',
                        }
                    }
                },
                create: {
                    id: t.id, // KEEP V1 ID for SubjectTeacher/TeacherClass links
                    schoolId: school.id,
                    employeeId: t.employeeId || t.teacherId || `T-${Math.floor(1000 + Math.random() * 9000)}`,
                    firstName: t.firstName || 'Unknown',
                    lastName: t.lastName || 'Teacher',
                    gender: (t.gender === 'M' || t.gender === 'MALE' ? 'MALE' : t.gender === 'F' || t.gender === 'FEMALE' ? 'FEMALE' : 'OTHER') as any,
                    email: t.email || null,
                    phone: t.phoneNumber || t.phone || null,
                    dateOfBirth: safeDate(t.dateOfBirth),
                    address: t.address || null,
                    hireDate: safeDate(t.hireDate) || new Date().toISOString(),
                    customFields: {
                        regional: {
                            khmerName: t.khmerName || null,
                            englishName: t.englishName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || null,
                            position: t.position || 'Teacher',
                        }
                    }
                }
            });
            created++;
        } catch (err: any) {
            console.log(`Failed for teacher ${t.id}: ${err.message}`);
        }
    }

    console.log(`✅ Successfully processed ${created} out of ${teachers.length} teachers.`);
}

main().finally(() => prisma.$disconnect());
