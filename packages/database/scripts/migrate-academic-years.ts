/**
 * Data Migration Script: academicYear String → academicYearId FK
 * 
 * This script migrates existing Class records from using a hardcoded
 * academicYear string to using academicYearId foreign key.
 * 
 * Steps:
 * 1. For each school, get or create academic years based on existing Class.academicYear values
 * 2. Update all classes to use the proper academicYearId
 * 3. Set the most recent year as "current" for each school
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAcademicYears() {
  console.log('🔄 Starting academic year migration...\n');

  try {
    // Get all schools
    const schools = await prisma.school.findMany({
      select: { id: true, name: true }
    });

    console.log(`📚 Found ${schools.length} school(s) to migrate\n`);

    for (const school of schools) {
      console.log(`\n🏫 Processing: ${school.name} (${school.id})`);

      // Get all unique academicYear strings for this school's classes
      const classes = await prisma.$queryRaw<Array<{ academicYear: string }>>`
        SELECT DISTINCT "academicYear" 
        FROM "classes" 
        WHERE "schoolId" = ${school.id}
      `;

      if (classes.length === 0) {
        console.log('   ⚠️  No classes found, skipping...');
        continue;
      }

      console.log(`   Found ${classes.length} unique academic year(s): ${classes.map(c => c.academicYear).join(', ')}`);

      // For each unique academicYear string, create or get AcademicYear record
      const academicYearMap = new Map<string, string>(); // academicYear string → academicYearId

      for (const { academicYear } of classes) {
        // Parse year string to create start/end dates
        const [startYear, endYear] = academicYear.split('-').map(y => parseInt(y));
        
        // Check if academic year already exists
        let academicYearRecord = await prisma.academicYear.findFirst({
          where: {
            schoolId: school.id,
            name: academicYear
          }
        });

        // Create if doesn't exist
        if (!academicYearRecord) {
          console.log(`   ✨ Creating academic year: ${academicYear}`);
          academicYearRecord = await prisma.academicYear.create({
            data: {
              schoolId: school.id,
              name: academicYear,
              startDate: new Date(startYear, 8, 1), // September 1
              endDate: new Date(endYear, 5, 30),    // June 30
              isCurrent: false // Will set current later
            }
          });
        } else {
          console.log(`   ✓ Academic year already exists: ${academicYear}`);
        }

        academicYearMap.set(academicYear, academicYearRecord.id);
      }

      // Update all classes for this school to use academicYearId
      console.log('   🔄 Updating classes with academicYearId...');
      
      for (const [academicYearString, academicYearId] of academicYearMap.entries()) {
        const result = await prisma.$executeRaw`
          UPDATE "classes" 
          SET "academicYearId" = ${academicYearId}
          WHERE "schoolId" = ${school.id} 
          AND "academicYear" = ${academicYearString}
        `;
        console.log(`   ✓ Updated ${result} class(es) for year ${academicYearString}`);
      }

      // Set the most recent year as current
      const sortedYears = Array.from(academicYearMap.keys()).sort().reverse();
      const currentYearString = sortedYears[0];
      const currentYearId = academicYearMap.get(currentYearString);

      if (currentYearId) {
        await prisma.academicYear.updateMany({
          where: { schoolId: school.id },
          data: { isCurrent: false }
        });

        await prisma.academicYear.update({
          where: { id: currentYearId },
          data: { isCurrent: true }
        });

        console.log(`   ✓ Set ${currentYearString} as current year`);
      }

      console.log(`   ✅ Completed migration for ${school.name}`);
    }

    console.log('\n✅ Academic year migration completed successfully!');
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const classesWithoutYearId = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM "classes" 
      WHERE "academicYearId" IS NULL
    `;
    
    const nullCount = Number(classesWithoutYearId[0].count);
    if (nullCount > 0) {
      console.log(`   ⚠️  WARNING: ${nullCount} class(es) still have NULL academicYearId`);
    } else {
      console.log('   ✓ All classes have academicYearId set');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateAcademicYears()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
