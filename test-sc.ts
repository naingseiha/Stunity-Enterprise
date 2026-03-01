import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ log: ['error'] });
async function main() {
  const students = require('./scripts/migrate-v1-to-v2/data/export-2026-03-01T13-39-08/students.json');
  const classes = require('./scripts/migrate-v1-to-v2/data/export-2026-03-01T13-39-08/classes.json');
  
  const s = students.find((x: any) => x.id === 'cmiqd09q3002pa5ff7x8wmzo2');
  if (!s) return console.log("Student not found");
  
  const cls = classes.find((c: any) => c.id === s.classId);
  console.log("Found student:", s.id, "Class:", cls?.name, "AY:", cls?.academicYear);
  
  try {
    const studentId = s.id; // Assuming we use same ID in DB
    const classId = s.classId;
    
    // Hardcoded test since we don't have idMap here
    const ay = await prisma.academicYear.findFirst({ where: { name: cls?.academicYear || '2024-2025' } });
    
    if (!ay) return console.log("AY missing in DB");

    await prisma.studentClass.create({
      data: {
        studentId,
        classId,
        academicYearId: ay.id,
        status: 'ACTIVE' as any
      }
    });
    console.log("SUCCESS");
  } catch (err: any) {
    console.log("ERROR:\n", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
