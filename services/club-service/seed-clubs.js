/**
 * Seed Sample Clubs Data
 * 
 * Creates sample clubs for testing the mobile app
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedClubs() {
  console.log('🌱 Seeding sample clubs...');

  try {
    // Get or create a test user to be the creator
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@stunity.com' }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@stunity.com',
          password: '$2a$10$YourHashedPasswordHere', // Hashed "Test123!"
          firstName: 'Test',
          lastName: 'User',
          role: 'TEACHER',
          isVerified: true,
        }
      });
    }

    // Create sample clubs
    const clubs = [
      {
        name: 'Advanced Mathematics Study Group',
        description: 'Weekly study sessions for calculus and linear algebra. Join us to solve challenging problems together!',
        type: 'CASUAL_STUDY_GROUP',
        mode: 'PUBLIC',
        creatorId: testUser.id,
        tags: ['Mathematics', 'Calculus', 'Linear Algebra'],
        isActive: true,
      },
      {
        name: 'Physics 101 - Spring 2026',
        description: 'Structured physics class covering mechanics, thermodynamics, and electromagnetism.',
        type: 'STRUCTURED_CLASS',
        mode: 'APPROVAL_REQUIRED',
        creatorId: testUser.id,
        tags: ['Physics', 'Science', 'Mechanics'],
        isActive: true,
      },
      {
        name: 'Web Development Project Team',
        description: 'Building a full-stack e-commerce platform using React and Node.js. Looking for motivated developers!',
        type: 'PROJECT_GROUP',
        mode: 'INVITE_ONLY',
        creatorId: testUser.id,
        tags: ['Web Development', 'React', 'Node.js', 'Full Stack'],
        isActive: true,
      },
      {
        name: 'SAT Prep - Math & English',
        description: 'Intensive SAT preparation focusing on math and English sections. Weekly practice tests included.',
        type: 'EXAM_PREP',
        mode: 'PUBLIC',
        creatorId: testUser.id,
        tags: ['SAT', 'Test Prep', 'Math', 'English'],
        isActive: true,
      },
      {
        name: 'Machine Learning Study Circle',
        description: 'Explore machine learning algorithms, neural networks, and AI applications together.',
        type: 'CASUAL_STUDY_GROUP',
        mode: 'PUBLIC',
        creatorId: testUser.id,
        tags: ['Machine Learning', 'AI', 'Python', 'Data Science'],
        isActive: true,
      },
      {
        name: 'Chemistry Lab Sessions',
        description: 'Hands-on chemistry experiments and lab work. Safety protocols strictly enforced.',
        type: 'STRUCTURED_CLASS',
        mode: 'APPROVAL_REQUIRED',
        creatorId: testUser.id,
        tags: ['Chemistry', 'Lab', 'Science', 'Experiments'],
        isActive: true,
      },
      {
        name: 'Mobile App Development',
        description: 'Building iOS and Android apps with React Native. Current project: fitness tracking app.',
        type: 'PROJECT_GROUP',
        mode: 'INVITE_ONLY',
        creatorId: testUser.id,
        tags: ['Mobile', 'React Native', 'iOS', 'Android'],
        isActive: true,
      },
      {
        name: 'GRE Preparation Intensive',
        description: 'Prepare for the GRE with structured lessons and practice tests. Target score: 320+',
        type: 'EXAM_PREP',
        mode: 'PUBLIC',
        creatorId: testUser.id,
        tags: ['GRE', 'Test Prep', 'Graduate School'],
        isActive: true,
      },
      {
        name: 'Spanish Conversation Club',
        description: 'Practice Spanish in a friendly environment. All levels welcome! ¡Hola amigos!',
        type: 'CASUAL_STUDY_GROUP',
        mode: 'PUBLIC',
        creatorId: testUser.id,
        tags: ['Spanish', 'Language', 'Conversation'],
        isActive: true,
      },
      {
        name: 'Biology Research Group',
        description: 'Conducting research on cellular biology and genetics. Weekly lab meetings and paper discussions.',
        type: 'STRUCTURED_CLASS',
        mode: 'APPROVAL_REQUIRED',
        creatorId: testUser.id,
        tags: ['Biology', 'Research', 'Genetics', 'Lab'],
        isActive: true,
      },
    ];

    for (const clubData of clubs) {
      const club = await prisma.studyClub.create({
        data: {
          name: clubData.name,
          description: clubData.description,
          clubType: clubData.type,
          mode: clubData.mode,
          creatorId: clubData.creatorId,
          tags: clubData.tags,
          isActive: clubData.isActive,
        },
      });

      // Add creator as owner/member
      await prisma.clubMember.create({
        data: {
          clubId: club.id,
          userId: testUser.id,
          role: 'OWNER',
          isActive: true,
          joinedAt: new Date(),
        },
      });

      console.log(`✅ Created club: ${club.name}`);
    }

    console.log(`\n🎉 Successfully seeded ${clubs.length} clubs!`);
    console.log(`\nTest with:`);
    console.log(`  curl http://localhost:3012/clubs`);
    console.log(`  or open the mobile app Clubs screen\n`);

  } catch (error) {
    console.error('❌ Error seeding clubs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedClubs();
