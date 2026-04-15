import { PrismaClient, CourseItemType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Java Course Database Seed...');

  // 1. We assume John Doe admin exists or we just pick a valid user to be Instructor.
  const instructor = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!instructor) {
    console.log('⚠️ No instructor found! Please run the main seed first.');
    return;
  }

  // 2. Erase existing course data for clean slate (CAUTION!)
  console.log('🗑️ Cleaning old learning data...');
  await prisma.courseReview.deleteMany();
  await prisma.enrollment.deleteMany();
  
  // Notice: Because of cascade deletes on Lesson to Quiz/Question/Option, deleting course cascade deletes everything!
  await prisma.course.deleteMany();

  // 3. Create the Course
  console.log('🏗️ Building "Mastering Java Programming" Course...');
  const javaCourse = await prisma.course.create({
    data: {
      title: 'Mastering Java Programming: From Zero to Enterprise',
      description: 'A comprehensive, professional-grade curriculum to take you from basic syntax to advanced Object Oriented principles, concluding with a real-world Banking System case study.',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2000&auto=format&fit=crop',
      category: 'Software Engineering',
      level: 'BEGINNER',
      status: 'PUBLISHED',
      isFree: true,
      price: 0,
      isPublished: true,
      instructorId: instructor.id,
      tags: ['Java', 'Backend', 'Software', 'OOP', 'Enterprise'],
    }
  });

  // 4. Create Sections
  const section1 = await prisma.courseSection.create({
    data: {
      courseId: javaCourse.id,
      title: 'Fundamentals of Java',
      order: 1
    }
  });

  const section2 = await prisma.courseSection.create({
    data: {
      courseId: javaCourse.id,
      title: 'Core Concepts & Structures',
      order: 2
    }
  });

  const section3 = await prisma.courseSection.create({
    data: {
      courseId: javaCourse.id,
      title: 'Advanced Object-Oriented Principles',
      order: 3
    }
  });

  // ──────────────────────────────────────────────
  // Section 1 Lessons
  // ──────────────────────────────────────────────
  
  // S1.L1: Welcome Video
  await prisma.lesson.create({
    data: {
      sectionId: section1.id,
      courseId: javaCourse.id,
      title: 'Welcome to the Java Ecosystem',
      type: CourseItemType.VIDEO,
      videoUrl: 'https://vimeo.com/264426543', // Example mock
      duration: 350,
      order: 1,
      isPublished: true,
      description: 'An overview of what Java is, the JVM, and why it powers the enterprise world.'
    }
  });

  // S1.L2: Setup Article
  await prisma.lesson.create({
    data: {
      sectionId: section1.id,
      courseId: javaCourse.id,
      title: 'Setting up JDK and IntelliJ IDEA',
      type: CourseItemType.ARTICLE,
      content: `<h1>Installing the JDK</h1><p>Before writing Java, you must install the <strong>Java Development Kit</strong> (JDK).</p><ul><li>Download from Oracle or Adoptium.</li><li>Set your JAVA_HOME environment variable.</li></ul><p>Next, install JetBrains IntelliJ IDEA Community edition, the standard IDE for Java developers.</p>`,
      order: 2,
      isPublished: true
    }
  });

  // ──────────────────────────────────────────────
  // Section 2 Lessons (Includes Quiz & Exercise)
  // ──────────────────────────────────────────────

  // S2.L1: Data Types Video
  await prisma.lesson.create({
    data: {
      sectionId: section2.id,
      courseId: javaCourse.id,
      title: 'Variables and Primitive Data Types',
      type: CourseItemType.VIDEO,
      videoUrl: 'https://vimeo.com/71239', // Mock
      duration: 520,
      order: 1,
      isPublished: true
    }
  });

  // S2.L2: Coding Exercise
  const exerciseLesson = await prisma.lesson.create({
    data: {
      sectionId: section2.id,
      courseId: javaCourse.id,
      title: 'Practice: Variable Declarations',
      type: CourseItemType.EXERCISE,
      order: 2,
      isPublished: true,
      content: 'Declare an integer named age, and a boolean named isStudent.' // Reuse content field for instructions
    }
  });

  await prisma.courseCodingExercise.create({
    data: {
      lessonId: exerciseLesson.id,
      language: 'java',
      initialCode: 'public class Main {\n  public static void main(String[] args) {\n    // TODO: Write your code here\n\n  }\n}',
      solution: 'public class Main {\n  public static void main(String[] args) {\n    int age = 18;\n    boolean isStudent = true;\n  }\n}'
    }
  });

  // S2.L3: Core Concepts Quiz
  const quizLesson = await prisma.lesson.create({
    data: {
      sectionId: section2.id,
      courseId: javaCourse.id,
      title: 'Checkpoint: Core Concepts',
      type: CourseItemType.QUIZ,
      order: 3,
      isPublished: true,
      content: 'Test your knowledge on primitives and logic control.'
    }
  });

  const quiz = await prisma.courseQuiz.create({
    data: {
      lessonId: quizLesson.id,
      passingScore: 80
    }
  });

  const q1 = await prisma.courseQuizQuestion.create({
    data: {
      quizId: quiz.id,
      question: 'Which of the following is NOT a primitive data type in Java?',
      order: 1
    }
  });
  await prisma.courseQuizOption.createMany({
    data: [
      { questionId: q1.id, text: 'int', isCorrect: false },
      { questionId: q1.id, text: 'boolean', isCorrect: false },
      { questionId: q1.id, text: 'String', isCorrect: true }, // String is an Object, not primitive
      { questionId: q1.id, text: 'float', isCorrect: false },
    ]
  });

  // ──────────────────────────────────────────────
  // Section 3 Lessons (Includes Assignment & Case Study)
  // ──────────────────────────────────────────────

  // S3.L1: Case Study
  await prisma.lesson.create({
    data: {
      sectionId: section3.id,
      courseId: javaCourse.id,
      title: 'Case Study: ATM Banking Architecture',
      type: CourseItemType.CASE_STUDY,
      order: 1,
      isPublished: true,
      content: '<h2>ATM System Modeling</h2><p>In this case study, we review how real banks map classes like Account, Transaction, and Customer to build a resilient ledger.</p><br/><i>(Refer to the attached resources)</i>'
    }
  });

  // S3.L2: Final Assignment
  const assignmentLesson = await prisma.lesson.create({
    data: {
      sectionId: section3.id,
      courseId: javaCourse.id,
      title: 'Final Project: Build a Calculator',
      type: CourseItemType.ASSIGNMENT,
      order: 2,
      isPublished: true
    }
  });

  await prisma.courseAssignment.create({
    data: {
      lessonId: assignmentLesson.id,
      instructions: '# Final Assignment\n\nWrite a Java Terminal Application that functions as a 4-function calculator.\n\n### Requirements:\n1. Prompt the user for two numbers.\n2. Prompt them for an operation (+, -, *, /).\n3. Return the result safely, handling DivisionByZero exceptions.',
      maxScore: 100,
      rubric: '- 50pts for correctness\n- 25pts for handling exceptions\n- 25pts for clean OOP structure'
    }
  });

  // Update total counts on course
  const totalLessons = await prisma.lesson.count({ where: { courseId: javaCourse.id } });
  await prisma.course.update({
    where: { id: javaCourse.id },
    data: { lessonsCount: totalLessons }
  });

  console.log(`✅ Success! Generated Java Course [${javaCourse.id}] with ${totalLessons} rich curriculum items.`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding java course:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
