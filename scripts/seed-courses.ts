import { PrismaClient, CourseLevel, ResourceType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCourses() {
  console.log('🌱 Seeding courses...');

  // Find an instructor (prefer teacher, then any user)
  let instructor = await prisma.user.findFirst({
    where: { role: 'TEACHER' },
  });

  if (!instructor) {
    instructor = await prisma.user.findFirst();
  }

  if (!instructor) {
    console.log('❌ No users found in database.');
    return;
  }

  console.log(`📚 Using instructor: ${instructor.firstName} ${instructor.lastName}`);

  // Sample courses data
  const coursesData = [
    {
      title: 'Introduction to Web Development',
      description: 'Learn the fundamentals of web development including HTML, CSS, and JavaScript. Perfect for beginners who want to build modern websites.',
      category: 'Programming',
      level: CourseLevel.BEGINNER,
      duration: 1200, // 20 hours in minutes
      price: 0,
      isFree: true,
      isFeatured: true,
      tags: ['HTML', 'CSS', 'JavaScript', 'Web Development'],
      thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
      lessons: [
        { title: 'What is Web Development?', description: 'Introduction to web development', duration: 15, isFree: true },
        { title: 'Setting Up Your Environment', description: 'Install VS Code and setup', duration: 20, isFree: true },
        { title: 'HTML Basics', description: 'Learn HTML structure and tags', duration: 45, isFree: false },
        { title: 'CSS Fundamentals', description: 'Style your web pages', duration: 60, isFree: false },
        { title: 'JavaScript Introduction', description: 'Add interactivity', duration: 90, isFree: false },
      ],
    },
    {
      title: 'Python for Data Science',
      description: 'Master Python programming for data analysis and visualization. Learn pandas, numpy, and matplotlib.',
      category: 'Data Science',
      level: CourseLevel.INTERMEDIATE,
      duration: 1800, // 30 hours
      price: 0,
      isFree: true,
      isFeatured: true,
      tags: ['Python', 'Data Science', 'Pandas', 'NumPy'],
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
      lessons: [
        { title: 'Python Basics Review', description: 'Quick Python refresher', duration: 30, isFree: true },
        { title: 'NumPy Fundamentals', description: 'Working with arrays', duration: 60, isFree: true },
        { title: 'Pandas DataFrames', description: 'Data manipulation with Pandas', duration: 90, isFree: false },
        { title: 'Data Visualization', description: 'Creating charts with Matplotlib', duration: 75, isFree: false },
        { title: 'Real-World Projects', description: 'Apply your skills', duration: 120, isFree: false },
      ],
    },
    {
      title: 'React.js Complete Guide',
      description: 'Build modern web applications with React. Learn hooks, state management, and best practices.',
      category: 'Programming',
      level: CourseLevel.INTERMEDIATE,
      duration: 2400, // 40 hours
      price: 0,
      isFree: true,
      isFeatured: true,
      tags: ['React', 'JavaScript', 'Frontend', 'Web Development'],
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
      lessons: [
        { title: 'React Fundamentals', description: 'Components and JSX', duration: 45, isFree: true },
        { title: 'State and Props', description: 'Managing component data', duration: 60, isFree: true },
        { title: 'React Hooks Deep Dive', description: 'useState, useEffect, and more', duration: 90, isFree: false },
        { title: 'Building a Todo App', description: 'Practical project', duration: 120, isFree: false },
        { title: 'State Management with Redux', description: 'Advanced state patterns', duration: 90, isFree: false },
      ],
    },
    {
      title: 'Machine Learning Fundamentals',
      description: 'Understand machine learning algorithms and build your first ML models with scikit-learn.',
      category: 'Machine Learning',
      level: CourseLevel.ADVANCED,
      duration: 3000, // 50 hours
      price: 0,
      isFree: true,
      isFeatured: false,
      tags: ['Machine Learning', 'Python', 'AI', 'scikit-learn'],
      thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800',
      lessons: [
        { title: 'What is Machine Learning?', description: 'Introduction to ML concepts', duration: 30, isFree: true },
        { title: 'Linear Regression', description: 'Your first ML algorithm', duration: 60, isFree: true },
        { title: 'Classification Algorithms', description: 'Logistic regression and more', duration: 90, isFree: false },
        { title: 'Decision Trees & Random Forests', description: 'Tree-based methods', duration: 75, isFree: false },
        { title: 'Neural Networks Intro', description: 'Deep learning basics', duration: 120, isFree: false },
      ],
    },
    {
      title: 'Mobile App Development with Flutter',
      description: 'Create beautiful cross-platform mobile apps with Flutter and Dart programming language.',
      category: 'Mobile Development',
      level: CourseLevel.BEGINNER,
      duration: 1500, // 25 hours
      price: 0,
      isFree: true,
      isFeatured: true,
      tags: ['Flutter', 'Dart', 'Mobile', 'iOS', 'Android'],
      thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800',
      lessons: [
        { title: 'Flutter Setup', description: 'Install Flutter SDK', duration: 20, isFree: true },
        { title: 'Dart Programming', description: 'Learn Dart basics', duration: 45, isFree: true },
        { title: 'Flutter Widgets', description: 'Building UI components', duration: 60, isFree: false },
        { title: 'Navigation & Routing', description: 'Multi-screen apps', duration: 45, isFree: false },
        { title: 'Building a Complete App', description: 'Full project walkthrough', duration: 120, isFree: false },
      ],
    },
    {
      title: 'UI/UX Design Principles',
      description: 'Learn design thinking, user research, and create beautiful user interfaces with Figma.',
      category: 'Design',
      level: CourseLevel.BEGINNER,
      duration: 900, // 15 hours
      price: 0,
      isFree: true,
      isFeatured: false,
      tags: ['UI Design', 'UX', 'Figma', 'Design Thinking'],
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
      lessons: [
        { title: 'Design Thinking', description: 'User-centered design process', duration: 30, isFree: true },
        { title: 'Color Theory', description: 'Working with colors', duration: 25, isFree: true },
        { title: 'Typography Basics', description: 'Fonts and readability', duration: 20, isFree: false },
        { title: 'Figma Fundamentals', description: 'Design tool mastery', duration: 60, isFree: false },
        { title: 'Creating a Design System', description: 'Scalable design patterns', duration: 45, isFree: false },
      ],
    },
    {
      title: 'Database Design & SQL',
      description: 'Master relational databases, SQL queries, and database optimization techniques.',
      category: 'Database',
      level: CourseLevel.INTERMEDIATE,
      duration: 1200, // 20 hours
      price: 0,
      isFree: true,
      isFeatured: false,
      tags: ['SQL', 'Database', 'PostgreSQL', 'MySQL'],
      thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800',
      lessons: [
        { title: 'Database Basics', description: 'What are databases?', duration: 20, isFree: true },
        { title: 'SQL SELECT Queries', description: 'Retrieving data', duration: 45, isFree: true },
        { title: 'Joins and Relationships', description: 'Connecting tables', duration: 60, isFree: false },
        { title: 'Database Design Principles', description: 'Normalization and schema', duration: 45, isFree: false },
        { title: 'Query Optimization', description: 'Making queries faster', duration: 30, isFree: false },
      ],
    },
    {
      title: 'Cloud Computing with AWS',
      description: 'Learn Amazon Web Services fundamentals - EC2, S3, Lambda, and cloud architecture.',
      category: 'Cloud Computing',
      level: CourseLevel.INTERMEDIATE,
      duration: 1800, // 30 hours
      price: 0,
      isFree: true,
      isFeatured: false,
      tags: ['AWS', 'Cloud', 'DevOps', 'Serverless'],
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
      lessons: [
        { title: 'Cloud Computing Intro', description: 'What is the cloud?', duration: 20, isFree: true },
        { title: 'AWS Account Setup', description: 'Getting started with AWS', duration: 15, isFree: true },
        { title: 'EC2 Virtual Servers', description: 'Running servers in the cloud', duration: 60, isFree: false },
        { title: 'S3 Storage', description: 'Object storage service', duration: 45, isFree: false },
        { title: 'Lambda Functions', description: 'Serverless computing', duration: 60, isFree: false },
      ],
    },
  ];

  // Create courses
  for (const courseData of coursesData) {
    const { lessons, ...course } = courseData;

    // Check if course already exists
    const existing = await prisma.course.findFirst({
      where: { title: course.title },
    });

    if (existing) {
      console.log(`⏭️  Course already exists: ${course.title}`);
      continue;
    }

    const createdCourse = await prisma.course.create({
      data: {
        ...course,
        instructorId: instructor.id,
        isPublished: true,
        enrolledCount: Math.floor(Math.random() * 5000) + 500,
        rating: 4 + Math.random(),
      },
    });

    // Create lessons for this course
    for (let i = 0; i < lessons.length; i++) {
      await prisma.lesson.create({
        data: {
          ...lessons[i],
          courseId: createdCourse.id,
          order: i + 1,
          isPublished: true,
          content: `<h1>${lessons[i].title}</h1><p>Lesson content goes here...</p>`,
        },
      });
    }

    console.log(`✅ Created course: ${course.title} with ${lessons.length} lessons`);
  }

  // Create Learning Paths
  const learningPaths = [
    {
      title: 'Full-Stack Web Developer',
      description: 'Become a complete web developer from frontend to backend. Master HTML, CSS, JavaScript, React, and more.',
      level: CourseLevel.BEGINNER,
      isFeatured: true,
      totalDuration: 6000,
      coursesCount: 3,
    },
    {
      title: 'Data Science Career Path',
      description: 'Start your journey in data science. Learn Python, data analysis, machine learning, and visualization.',
      level: CourseLevel.INTERMEDIATE,
      isFeatured: true,
      totalDuration: 8000,
      coursesCount: 2,
    },
  ];

  for (const pathData of learningPaths) {
    const existing = await prisma.learningPath.findFirst({
      where: { title: pathData.title },
    });

    if (existing) {
      console.log(`⏭️  Learning path already exists: ${pathData.title}`);
      continue;
    }

    await prisma.learningPath.create({
      data: {
        ...pathData,
        creatorId: instructor.id,
        enrolledCount: Math.floor(Math.random() * 2000) + 200,
      },
    });

    console.log(`✅ Created learning path: ${pathData.title}`);
  }

  console.log('');
  console.log('🎉 Course seeding complete!');
}

seedCourses()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
