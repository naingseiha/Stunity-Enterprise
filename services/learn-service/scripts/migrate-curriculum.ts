import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting Curriculum Migration...');

  try {
    // 1. Find all courses that have lessons without a section
    const coursesWithOrphanedLessons = await prisma.course.findMany({
      where: {
        lessons: {
          some: {
            sectionId: null
          }
        }
      },
      include: {
        lessons: {
          where: { sectionId: null },
          orderBy: { order: 'asc' }
        }
      }
    });

    console.log(`Found ${coursesWithOrphanedLessons.length} courses needing migration.`);

    for (const course of coursesWithOrphanedLessons) {
      console.log(`📦 Migrating Course: ${course.title} (${course.id})`);

      // 2. Create a default section
      const defaultSection = await prisma.courseSection.create({
        data: {
          courseId: course.id,
          title: 'Module 1: General Content',
          order: 0,
        }
      });

      console.log(`   ✅ Created default section: ${defaultSection.id}`);

      // 3. Move all orphaned lessons to this new section
      const lessonIds = course.lessons.map(l => l.id);
      
      const updateResult = await prisma.lesson.updateMany({
        where: {
          id: { in: lessonIds }
        },
        data: {
          sectionId: defaultSection.id
        }
      });

      console.log(`   ✅ Moved ${updateResult.count} lessons to section.`);
    }

    console.log('✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
