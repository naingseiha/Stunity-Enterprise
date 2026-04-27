import { CourseItemType, CourseLevel, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const seedMode = String(process.env.COURSE_SEED_MODE || '').trim().toLowerCase();
const shouldReplaceExisting = seedMode === 'replace';

type LocalizedCopy = {
  base: string;
  translations: {
    en: string;
    km: string;
  };
};

type QuizBlueprint = {
  passingScore?: number;
  questions: Array<{
    question: string;
    explanation?: string;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>;
};

type AssignmentBlueprint = {
  maxScore?: number;
  passingScore?: number;
  instructions: LocalizedCopy;
  rubric?: LocalizedCopy;
};

type ExerciseBlueprint = {
  language: string;
  initialCode: string;
  solution?: string;
  testCases?: string;
};

type LessonBlueprint = {
  type: CourseItemType;
  title: LocalizedCopy;
  description?: LocalizedCopy;
  content?: LocalizedCopy;
  duration: number;
  isFree: boolean;
  videoUrl?: string;
  quiz?: QuizBlueprint;
  assignment?: AssignmentBlueprint;
  exercise?: ExerciseBlueprint;
};

type SectionBlueprint = {
  title: LocalizedCopy;
  description?: LocalizedCopy;
  lessons: LessonBlueprint[];
};

type CourseBlueprint = {
  title: LocalizedCopy;
  description: LocalizedCopy;
  category: string;
  level: CourseLevel;
  thumbnail: string;
  tags: string[];
  isFeatured?: boolean;
  enrolledCount?: number;
  rating?: number;
  reviewsCount?: number;
  sections: SectionBlueprint[];
};

const t = (en: string, km: string): LocalizedCopy => ({
  base: en,
  translations: {
    en,
    km,
  },
});

const articleHtml = (heading: string, intro: string, bullets: string[], closing: string) => `
  <h1>${heading}</h1>
  <p>${intro}</p>
  <ul>
    ${bullets.map((bullet) => `<li>${bullet}</li>`).join('')}
  </ul>
  <p>${closing}</p>
`;

const articleLesson = (input: {
  title: LocalizedCopy;
  description: LocalizedCopy;
  heading: LocalizedCopy;
  intro: LocalizedCopy;
  bulletsEn: string[];
  bulletsKm: string[];
  closing: LocalizedCopy;
  duration: number;
  isFree?: boolean;
}): LessonBlueprint => ({
  type: CourseItemType.ARTICLE,
  title: input.title,
  description: input.description,
  content: t(
    articleHtml(input.heading.translations.en, input.intro.translations.en, input.bulletsEn, input.closing.translations.en),
    articleHtml(input.heading.translations.km, input.intro.translations.km, input.bulletsKm, input.closing.translations.km)
  ),
  duration: input.duration,
  isFree: input.isFree ?? false,
});

const videoLesson = (input: {
  title: LocalizedCopy;
  description: LocalizedCopy;
  duration: number;
  isFree?: boolean;
  videoUrl?: string;
}): LessonBlueprint => ({
  type: CourseItemType.VIDEO,
  title: input.title,
  description: input.description,
  duration: input.duration,
  isFree: input.isFree ?? false,
  videoUrl: input.videoUrl || 'https://vimeo.com/264426543',
});

const assignmentLesson = (input: {
  title: LocalizedCopy;
  description: LocalizedCopy;
  duration: number;
  instructions: LocalizedCopy;
  rubric?: LocalizedCopy;
}): LessonBlueprint => ({
  type: CourseItemType.ASSIGNMENT,
  title: input.title,
  description: input.description,
  duration: input.duration,
  isFree: false,
  assignment: {
    maxScore: 100,
    passingScore: 80,
    instructions: input.instructions,
    rubric: input.rubric,
  },
});

const quizLesson = (input: {
  title: LocalizedCopy;
  description: LocalizedCopy;
  duration: number;
  questions: QuizBlueprint['questions'];
}): LessonBlueprint => ({
  type: CourseItemType.QUIZ,
  title: input.title,
  description: input.description,
  duration: input.duration,
  isFree: false,
  quiz: {
    passingScore: 80,
    questions: input.questions,
  },
});

const exerciseLesson = (input: {
  title: LocalizedCopy;
  description: LocalizedCopy;
  duration: number;
  language: string;
  initialCode: string;
  solution?: string;
  testCases?: string;
}): LessonBlueprint => ({
  type: CourseItemType.EXERCISE,
  title: input.title,
  description: input.description,
  duration: input.duration,
  isFree: false,
  exercise: {
    language: input.language,
    initialCode: input.initialCode,
    solution: input.solution,
    testCases: input.testCases,
  },
});

const buildStarterCourse = (input: {
  title: LocalizedCopy;
  description: LocalizedCopy;
  category: string;
  level: CourseLevel;
  thumbnail: string;
  tags: string[];
  outcomeEn: string;
  outcomeKm: string;
  projectEn: string;
  projectKm: string;
}): CourseBlueprint => ({
  title: input.title,
  description: input.description,
  category: input.category,
  level: input.level,
  thumbnail: input.thumbnail,
  tags: input.tags,
  enrolledCount: 420,
  rating: 4.7,
  reviewsCount: 88,
  sections: [
    {
      title: t('Section 1: Foundations', 'ផ្នែកទី ១៖ មូលដ្ឋាន'),
      description: t('Build shared vocabulary and core concepts.', 'បង្កើតវាក្យសព្ទរួម និងគំនិតស្នូល។'),
      lessons: [
        articleLesson({
          title: t(`What You Need to Know About ${input.title.translations.en}`, `អ្វីដែលអ្នកត្រូវដឹងអំពី ${input.title.translations.km}`),
          description: t('Get the landscape, terminology, and goals of the course.', 'យល់ពីទិដ្ឋភាព ទម្លាក់ពាក្យបច្ចេកទេស និងគោលដៅរបស់មេរៀន។'),
          heading: t(`Core ideas in ${input.category}`, `គំនិតស្នូលក្នុង ${input.category}`),
          intro: t(input.outcomeEn, input.outcomeKm),
          bulletsEn: [
            'Understand the key workflow used by professionals.',
            'Learn the language and metrics used in the field.',
            'Connect fundamentals to real decision-making.',
          ],
          bulletsKm: [
            'យល់ពីលំហូរការងារសំខាន់ដែលអ្នកជំនាញប្រើប្រាស់។',
            'ស្គាល់ពាក្យបច្ចេកទេស និងសូចនាករដែលប្រើក្នុងវិស័យនេះ។',
            'ភ្ជាប់មូលដ្ឋានទៅនឹងការសម្រេចចិត្តជាក់ស្តែង។',
          ],
          closing: t('This lesson sets up the rest of the course with a practical mindset.', 'មេរៀននេះរៀបចំគ្រឹះសម្រាប់វគ្គទាំងមូលដោយផ្តោតលើការអនុវត្ត។'),
          duration: 18,
          isFree: true,
        }),
        videoLesson({
          title: t('Professional Workflow Walkthrough', 'ការបង្ហាញលំហូរការងាររបស់អ្នកជំនាញ'),
          description: t('See how the work is scoped, executed, and reviewed.', 'មើលរបៀបកំណត់ទំហំការងារ អនុវត្ត និងពិនិត្យឡើងវិញ។'),
          duration: 22,
          isFree: true,
        }),
      ],
    },
    {
      title: t('Section 2: Application', 'ផ្នែកទី ២៖ ការអនុវត្ត'),
      description: t('Apply concepts through review and a project brief.', 'អនុវត្តគំនិតតាមរយៈការពិនិត្យ និងបេសកកម្មគម្រោង។'),
      lessons: [
        quizLesson({
          title: t('Checkpoint Quiz', 'តេស្តពិនិត្យចំណេះដឹង'),
          description: t('Validate the core concepts before moving ahead.', 'ផ្ទៀងផ្ទាត់គំនិតស្នូលមុនបន្តទៅមុខ។'),
          duration: 12,
          questions: [
            {
              question: `What is the main goal of the first workflow in ${input.category}?`,
              explanation: 'A good workflow makes quality and speed repeatable.',
              options: [
                { text: 'To make the process repeatable and measurable', isCorrect: true },
                { text: 'To remove every human decision', isCorrect: false },
                { text: 'To avoid planning completely', isCorrect: false },
                { text: 'To focus only on tools, not outcomes', isCorrect: false },
              ],
            },
            {
              question: 'Why do professionals document assumptions early?',
              explanation: 'It keeps teams aligned and reduces downstream rework.',
              options: [
                { text: 'To align teams and reduce rework', isCorrect: true },
                { text: 'To delay execution as long as possible', isCorrect: false },
                { text: 'To avoid stakeholder feedback', isCorrect: false },
                { text: 'To increase complexity intentionally', isCorrect: false },
              ],
            },
          ],
        }),
        assignmentLesson({
          title: t('Mini Capstone Brief', 'បេសកកម្មគម្រោងខ្នាតតូច'),
          description: t('Turn the course concepts into a small deliverable.', 'បម្លែងគំនិតក្នុងវគ្គសិក្សាទៅជាលទ្ធផលខ្នាតតូចមួយ។'),
          duration: 28,
          instructions: t(
            `Create a short project brief that explains how you would apply this course to ${input.projectEn}. Include goals, process, and success criteria.`,
            `បង្កើតសេចក្តីសង្ខេបគម្រោងខ្លីមួយដែលពន្យល់ថា អ្នកនឹងអនុវត្តវគ្គនេះទៅលើ ${input.projectKm} ដោយដាក់បញ្ចូលគោលដៅ ដំណើរការ និងលក្ខណៈវិនិច្ឆ័យជោគជ័យ។`
          ),
          rubric: t(
            '40% clarity, 30% practical thinking, 30% completeness.',
            '៤០% ភាពច្បាស់លាស់ ៣០% ការគិតអនុវត្តបាន ៣០% ភាពពេញលេញ។'
          ),
        }),
      ],
    },
  ],
});

const flagshipCourses: CourseBlueprint[] = [
  {
    title: t('Master C Programming', 'ជំនាញពេញលេញលើភាសា C'),
    description: t(
      'A bilingual, textbook-style journey through C programming with articles, exercises, quizzes, and a final systems-focused assignment.',
      'ដំណើរសិក្សាពីភាសា C ជាទម្រង់សៀវភៅពីរភាសា ដែលមានអត្ថបទ លំហាត់ តេស្ត និងបេសកកម្មចុងក្រោយផ្តោតលើការគិតប្រព័ន្ធ។'
    ),
    category: 'Programming',
    level: CourseLevel.BEGINNER,
    thumbnail: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&q=80',
    tags: ['C', 'Programming', 'Systems', 'Memory', 'Algorithms'],
    isFeatured: true,
    enrolledCount: 1840,
    rating: 4.9,
    reviewsCount: 326,
    sections: [
      {
        title: t('Chapter 1: Foundations', 'ជំពូកទី ១៖ មូលដ្ឋាន'),
        description: t('Build the mental model for how C programs work.', 'បង្កើតគំរូគំនិតសម្រាប់របៀបដំណើរការនៃកម្មវិធី C។'),
        lessons: [
          articleLesson({
            title: t('What Makes C Powerful?', 'ហេតុអ្វីបានជា C មានអំណាចខ្លាំង?'),
            description: t('Understand history, systems use cases, and control over memory.', 'យល់ពីប្រវត្តិ ករណីប្រើប្រាស់ក្នុងប្រព័ន្ធ និងការគ្រប់គ្រងអង្គចងចាំ។'),
            heading: t('Why C still matters', 'ហេតុអ្វី C នៅតែសំខាន់'),
            intro: t(
              'C gives developers low-level control with a small, disciplined language surface.',
              'C ផ្តល់ឱ្យអ្នកអភិវឌ្ឍន៍នូវការគ្រប់គ្រងកម្រិតទាបជាមួយភាសាតូច ប៉ុន្តែមានវិន័យខ្ពស់។'
            ),
            bulletsEn: [
              'Compilers translate efficient code close to the machine.',
              'The language teaches memory, pointers, and data layout clearly.',
              'It remains central to embedded systems, kernels, and performance-critical software.',
            ],
            bulletsKm: [
              'កុំពាយឡ័រ បម្លែងកូដឱ្យមានប្រសិទ្ធភាពជិតស្និទ្ធនឹងម៉ាស៊ីន។',
              'ភាសានេះបង្រៀនអំពីអង្គចងចាំ ព្រួញយោង និងការរៀបចំទិន្នន័យយ៉ាងច្បាស់។',
              'វានៅតែសំខាន់សម្រាប់ embedded systems, kernels និង software ដែលត្រូវការល្បឿនខ្ពស់។',
            ],
            closing: t('You will use that control responsibly throughout the course.', 'អ្នកនឹងប្រើការគ្រប់គ្រងនោះយ៉ាងមានទំនួលខុសត្រូវទូទាំងវគ្គនេះ។'),
            duration: 20,
            isFree: true,
          }),
          articleLesson({
            title: t('Setting Up GCC and VS Code', 'ការរៀបចំ GCC និង VS Code'),
            description: t('Prepare a reliable local environment for compiling and debugging.', 'រៀបចំបរិស្ថាន local ដែលអាចទុកចិត្តបានសម្រាប់ compile និង debug។'),
            heading: t('A stable setup matters', 'ការរៀបចំឱ្យមានស្ថេរភាពគឺសំខាន់'),
            intro: t(
              'A clean setup helps beginners focus on logic instead of tool errors.',
              'ការរៀបចំស្អាតជួយឱ្យអ្នកចាប់ផ្តើមផ្តោតលើតក្កវិជ្ជាជំនួសឱ្យបញ្ហាឧបករណ៍។'
            ),
            bulletsEn: [
              'Install GCC or Clang and confirm the compiler path.',
              'Configure editor tasks so compile and run steps are repeatable.',
              'Use simple folder conventions to keep projects understandable.',
            ],
            bulletsKm: [
              'ដំឡើង GCC ឬ Clang ហើយផ្ទៀងផ្ទាត់ path របស់ compiler។',
              'កំណត់ editor tasks ដើម្បីឱ្យជំហាន compile និង run អាចធ្វើម្តងហើយម្តងទៀតបាន។',
              'ប្រើរចនាសម្ព័ន្ធថតសាមញ្ញដើម្បីធ្វើឱ្យគម្រោងងាយយល់។',
            ],
            closing: t('This lesson gives you the workflow used for the rest of the book.', 'មេរៀននេះផ្តល់ workflow ដែលនឹងប្រើសម្រាប់សៀវភៅទាំងមូល។'),
            duration: 18,
            isFree: true,
          }),
          exerciseLesson({
            title: t('Exercise: Hello World and Variables', 'លំហាត់៖ Hello World និងអថេរ'),
            description: t('Write, compile, and run a small C program confidently.', 'សរសេរ compile និង run កម្មវិធី C ខ្នាតតូចដោយទំនុកចិត្ត។'),
            duration: 25,
            language: 'c',
            initialCode: '#include <stdio.h>\n\nint main(void) {\n  // TODO: print your name and age\n  return 0;\n}\n',
            solution: '#include <stdio.h>\n\nint main(void) {\n  int age = 18;\n  printf(\"My name is Stunity Learner.\\n\");\n  printf(\"I am %d years old.\\n\", age);\n  return 0;\n}\n',
            testCases: 'Compile successfully and print two lines of output.',
          }),
        ],
      },
      {
        title: t('Chapter 2: Data and Control Flow', 'ជំពូកទី ២៖ ទិន្នន័យ និងលំហូរការគ្រប់គ្រង'),
        description: t('Practice the language constructs you will use constantly.', 'អនុវត្តរចនាសម្ព័ន្ធភាសាដែលអ្នកនឹងប្រើជាញឹកញាប់។'),
        lessons: [
          videoLesson({
            title: t('Reading and Writing Data with scanf and printf', 'ការអាន និងបង្ហាញទិន្នន័យដោយ scanf និង printf'),
            description: t('Learn the input-output patterns every learner needs.', 'រៀនពី pattern នៃ input-output ដែលអ្នកសិក្សាទាំងអស់ត្រូវការ។'),
            duration: 24,
          }),
          quizLesson({
            title: t('Quiz: Core Syntax Checkpoint', 'តេស្ត៖ ចំណុចពិនិត្យ syntax មូលដ្ឋាន'),
            description: t('Validate types, operators, and conditions.', 'ផ្ទៀងផ្ទាត់ប្រភេទទិន្នន័យ operators និងលក្ខខណ្ឌ។'),
            duration: 14,
            questions: [
              {
                question: 'Which format specifier is commonly used for an integer in C?',
                options: [
                  { text: '%d', isCorrect: true },
                  { text: '%s', isCorrect: false },
                  { text: '%f', isCorrect: false },
                  { text: '%c', isCorrect: false },
                ],
              },
              {
                question: 'What does an if statement help you do?',
                options: [
                  { text: 'Run code conditionally', isCorrect: true },
                  { text: 'Store all data permanently', isCorrect: false },
                  { text: 'Compile faster automatically', isCorrect: false },
                  { text: 'Replace every loop', isCorrect: false },
                ],
              },
            ],
          }),
        ],
      },
      {
        title: t('Chapter 3: Final Application', 'ជំពូកទី ៣៖ ការអនុវត្តចុងក្រោយ'),
        description: t('Bring the concepts together in one focused assignment.', 'យកគំនិតទាំងអស់មករួមបញ្ចូលគ្នាក្នុងបេសកកម្មចុងក្រោយមួយ។'),
        lessons: [
          assignmentLesson({
            title: t('Build a Console Budget Tracker', 'បង្កើតកម្មវិធីតាមដានថវិកាតាម Console'),
            description: t('Use variables, loops, and conditions in one practical program.', 'ប្រើអថេរ loops និងលក្ខខណ្ឌក្នុងកម្មវិធីអនុវត្តជាក់ស្តែងមួយ។'),
            duration: 36,
            instructions: t(
              'Build a terminal budget tracker that records income, expenses, and a final balance summary.',
              'បង្កើតកម្មវិធី budget tracker តាម terminal ដែលកត់ត្រាចំណូល ចំណាយ និងសរុបសមតុល្យចុងក្រោយ។'
            ),
            rubric: t(
              '40% correctness, 30% readable code, 30% sensible user flow.',
              '៤០% ភាពត្រឹមត្រូវ ៣០% កូដអានងាយ ៣០% លំហូរប្រើប្រាស់សមហេតុផល។'
            ),
          }),
        ],
      },
    ],
  },
  {
    title: t('English Communication Studio', 'ស្ទូឌីយោទំនាក់ទំនងភាសាអង់គ្លេស'),
    description: t(
      'A bilingual communication course designed like a premium coaching program, blending videos, readings, checkpoints, and a practical speaking assignment.',
      'វគ្គទំនាក់ទំនងពីរភាសាដែលរចនាដូចកម្មវិធីបណ្តុះបណ្តាលកម្រិតពិសេស ដោយបញ្ចូលវីដេអូ អត្ថបទ តេស្ត និងបេសកកម្មនិយាយជាក់ស្តែង។'
    ),
    category: 'Languages',
    level: CourseLevel.ALL_LEVELS,
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
    tags: ['English', 'Speaking', 'Communication', 'Presentation', 'Confidence'],
    isFeatured: true,
    enrolledCount: 1510,
    rating: 4.8,
    reviewsCount: 214,
    sections: [
      {
        title: t('Module 1: Speaking with Structure', 'ម៉ូឌុលទី ១៖ និយាយដោយមានរចនាសម្ព័ន្ធ'),
        description: t('Learn how to sound clear, calm, and professional.', 'រៀននិយាយឱ្យច្បាស់ ស្ងប់ស្ងាត់ និងមានវិជ្ជាជីវៈ។'),
        lessons: [
          videoLesson({
            title: t('How to Organize a Clear Message', 'របៀបរៀបចំសារឱ្យច្បាស់'),
            description: t('Use simple opening, body, and close patterns in daily communication.', 'ប្រើ pattern សាមញ្ញនៃ opening, body និង close ក្នុងទំនាក់ទំនងប្រចាំថ្ងៃ។'),
            duration: 20,
            isFree: true,
          }),
          articleLesson({
            title: t('Useful Phrases for Meetings and Introductions', 'ឃ្លាដែលមានប្រយោជន៍សម្រាប់កិច្ចប្រជុំ និងការណែនាំខ្លួន'),
            description: t('Build a small language bank you can reuse immediately.', 'បង្កើត language bank តូចមួយដែលអ្នកអាចយកទៅប្រើភ្លាមៗ។'),
            heading: t('Speak with confidence', 'និយាយដោយទំនុកចិត្ត'),
            intro: t(
              'Fluent communication often starts with dependable sentence patterns.',
              'ការទំនាក់ទំនង fluently ច្រើនដងចាប់ផ្តើមពី sentence patterns ដែលអាចទុកចិត្តបាន។'
            ),
            bulletsEn: [
              'Use direct openings to set context quickly.',
              'Confirm understanding with short follow-up phrases.',
              'Close conversations with clear next steps.',
            ],
            bulletsKm: [
              'ប្រើ opening ខ្លីច្បាស់ដើម្បីកំណត់បរិបទឱ្យរហ័ស។',
              'បញ្ជាក់ការយល់ដឹងដោយឃ្លាខ្លីៗបន្ទាប់។',
              'បិទការសន្ទនាដោយ next steps ដែលច្បាស់លាស់។',
            ],
            closing: t('These patterns reduce pressure when you speak under time constraints.', 'pattern ទាំងនេះជួយកាត់បន្ថយសម្ពាធនៅពេលអ្នកនិយាយក្រោមការកំណត់ពេលវេលា។'),
            duration: 17,
            isFree: true,
          }),
        ],
      },
      {
        title: t('Module 2: Practical Delivery', 'ម៉ូឌុលទី ២៖ ការនាំសារជាក់ស្តែង'),
        description: t('Move from phrases to prepared performance.', 'ផ្លាស់ពីឃ្លាដែលបានរៀនទៅការបង្ហាញដែលបានរៀបចំ។'),
        lessons: [
          quizLesson({
            title: t('Checkpoint: Speaking Patterns', 'ចំណុចពិនិត្យ៖ លំនាំនៃការនិយាយ'),
            description: t('Check your understanding of structure and transitions.', 'ពិនិត្យការយល់ដឹងអំពីរចនាសម្ព័ន្ធ និងការផ្លាស់ប្តូរ។'),
            duration: 10,
            questions: [
              {
                question: 'What makes a spoken message easier to follow?',
                options: [
                  { text: 'A clear structure with transitions', isCorrect: true },
                  { text: 'Speaking as fast as possible', isCorrect: false },
                  { text: 'Using difficult vocabulary only', isCorrect: false },
                  { text: 'Skipping the conclusion', isCorrect: false },
                ],
              },
            ],
          }),
          assignmentLesson({
            title: t('Assignment: Two-Minute Introduction', 'បេសកកម្ម៖ ការណែនាំខ្លួនរយៈពេលពីរនាទី'),
            description: t('Prepare a short introduction for school, work, or community settings.', 'រៀបចំការណែនាំខ្លីមួយសម្រាប់សាលា ការងារ ឬសហគមន៍។'),
            duration: 24,
            instructions: t(
              'Record or write a two-minute self-introduction using a clear opening, three supporting points, and a strong close.',
              'ថតសំឡេង ឬសរសេរការណែនាំខ្លួនរយៈពេលពីរនាទី ដោយមានការចាប់ផ្តើមច្បាស់ ចំណុចគាំទ្របី និងការបញ្ចប់រឹងមាំ។'
            ),
            rubric: t(
              '35% structure, 35% clarity, 30% confidence and practical tone.',
              '៣៥% រចនាសម្ព័ន្ធ ៣៥% ភាពច្បាស់ ៣០% ទំនុកចិត្ត និងសំឡេងអនុវត្តបាន។'
            ),
          }),
        ],
      },
    ],
  },
];

const catalogCourses: CourseBlueprint[] = [
  buildStarterCourse({
    title: t('Data Science with Python Workflows', 'លំហូរការងារ Data Science ដោយ Python'),
    description: t('Learn how modern analysts move from raw data to actionable insights.', 'រៀនពីរបៀបដែលអ្នកវិភាគសម័យថ្មីបម្លែងទិន្នន័យដើមទៅជាចំណេះដឹងដែលអាចអនុវត្តបាន។'),
    category: 'Data Science',
    level: CourseLevel.INTERMEDIATE,
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
    tags: ['Python', 'Analytics', 'Pandas', 'Visualization'],
    outcomeEn: 'This course focuses on repeatable analysis, not one-off spreadsheets.',
    outcomeKm: 'វគ្គនេះផ្តោតលើការវិភាគដែលអាចធ្វើឡើងវិញបាន មិនមែនត្រឹម spreadsheet ម្តងមួយទេ។',
    projectEn: 'a monthly performance dashboard for a school or business team',
    projectKm: 'dashboard បង្ហាញប្រសិទ្ធភាពប្រចាំខែសម្រាប់សាលា ឬក្រុមអាជីវកម្ម',
  }),
  buildStarterCourse({
    title: t('Machine Learning Foundations', 'មូលដ្ឋានគ្រឹះ Machine Learning'),
    description: t('Understand the modeling process before jumping into advanced frameworks.', 'យល់ពីដំណើរការសាងសង់ម៉ូឌែលមុនចូលទៅកាន់ frameworks កម្រិតខ្ពស់។'),
    category: 'Machine Learning',
    level: CourseLevel.INTERMEDIATE,
    thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80',
    tags: ['ML', 'Models', 'Evaluation', 'Scikit-learn'],
    outcomeEn: 'You will learn how models are scoped, trained, and reviewed responsibly.',
    outcomeKm: 'អ្នកនឹងរៀនពីរបៀបកំណត់ scope បណ្តុះបណ្តាល និងពិនិត្យម៉ូឌែលយ៉ាងមានទំនួលខុសត្រូវ។',
    projectEn: 'a simple learner retention prediction experiment',
    projectKm: 'ការសាកល្បងព្យាករណ៍អត្រារក្សាទុកអ្នកសិក្សា',
  }),
  buildStarterCourse({
    title: t('Flutter Mobile App Builder', 'អ្នកបង្កើតកម្មវិធីទូរស័ព្ទដោយ Flutter'),
    description: t('Design and ship mobile experiences with a practical component mindset.', 'រចនា និងបញ្ចេញបទពិសោធន៍ mobile ដោយមានគំនិតអនុវត្តលើ components។'),
    category: 'Mobile Development',
    level: CourseLevel.BEGINNER,
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
    tags: ['Flutter', 'Mobile', 'Dart', 'UI'],
    outcomeEn: 'The course prioritizes fast iteration, reusable widgets, and product thinking.',
    outcomeKm: 'វគ្គនេះផ្តល់អាទិភាពដល់ការកែប្រែលឿន widgets ដែលអាចប្រើឡើងវិញបាន និងការគិតជាផលិតផល។',
    projectEn: 'a lightweight campus events mobile app',
    projectKm: 'កម្មវិធី mobile ស្រាលមួយសម្រាប់ព្រឹត្តិការណ៍នៅវិទ្យាល័យ ឬសាកលវិទ្យាល័យ',
  }),
  buildStarterCourse({
    title: t('Product Design in Figma', 'ការរចនាផលិតផលក្នុង Figma'),
    description: t('Move from interface ideas to systems-level design decisions.', 'ផ្លាស់ពីគំនិត interface ទៅសេចក្តីសម្រេចចិត្តរចនាកម្រិតប្រព័ន្ធ។'),
    category: 'Design',
    level: CourseLevel.BEGINNER,
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80',
    tags: ['Figma', 'UI', 'UX', 'Design System'],
    outcomeEn: 'You will learn to design with consistency, hierarchy, and user intent.',
    outcomeKm: 'អ្នកនឹងរៀនរចនាដោយមានភាពស្របគ្នា កម្រិតអាទិភាព និងគោលបំណងអ្នកប្រើ។',
    projectEn: 'a course marketplace landing experience',
    projectKm: 'បទពិសោធន៍ landing page សម្រាប់ទីផ្សារវគ្គសិក្សា',
  }),
  buildStarterCourse({
    title: t('SQL and Database Design Essentials', 'មូលដ្ឋាន SQL និងការរចនា Database'),
    description: t('Learn how clean schemas and queries support production software.', 'រៀនពីរបៀបដែល schema និង query ស្អាតគាំទ្រ software កម្រិត production។'),
    category: 'Database',
    level: CourseLevel.INTERMEDIATE,
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=80',
    tags: ['SQL', 'Database', 'Schema', 'PostgreSQL'],
    outcomeEn: 'The lessons emphasize trustworthy data structure and practical querying.',
    outcomeKm: 'មេរៀនទាំងនេះផ្តោតលើរចនាសម្ព័ន្ធទិន្នន័យដែលអាចទុកចិត្តបាន និង query ដែលអនុវត្តបាន។',
    projectEn: 'a course enrollment reporting database',
    projectKm: 'database សម្រាប់របាយការណ៍ការចុះឈ្មោះវគ្គសិក្សា',
  }),
  buildStarterCourse({
    title: t('Cloud Computing with AWS Fundamentals', 'មូលដ្ឋាន Cloud Computing ដោយ AWS'),
    description: t('Understand core infrastructure choices for scalable digital products.', 'យល់ពីជម្រើស infrastructure ស្នូលសម្រាប់ផលិតផលឌីជីថលដែលអាចពង្រីកបាន។'),
    category: 'Cloud Computing',
    level: CourseLevel.INTERMEDIATE,
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
    tags: ['AWS', 'Cloud', 'Infrastructure', 'Scaling'],
    outcomeEn: 'This course focuses on clear service selection and deployment thinking.',
    outcomeKm: 'វគ្គនេះផ្តោតលើការជ្រើសសេវាកម្មឱ្យច្បាស់ និងការគិតអំពី deployment។',
    projectEn: 'a starter architecture for an online learning platform',
    projectKm: 'architecture ចាប់ផ្តើមសម្រាប់វេទិកាសិក្សាអនឡាញ',
  }),
  buildStarterCourse({
    title: t('Applied Mathematics for Data Thinking', 'គណិតវិទ្យាអនុវត្តសម្រាប់ការគិតជាទិន្នន័យ'),
    description: t('Build mathematical intuition for analytical and technical work.', 'បង្កើតការយល់ដឹងគណិតវិទ្យាសម្រាប់ការងារវិភាគ និងបច្ចេកទេស។'),
    category: 'Mathematics',
    level: CourseLevel.INTERMEDIATE,
    thumbnail: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&q=80',
    tags: ['Math', 'Logic', 'Statistics', 'Problem Solving'],
    outcomeEn: 'You will learn how formulas support decision quality instead of just memorization.',
    outcomeKm: 'អ្នកនឹងរៀនថា formula គាំទ្រគុណភាពសេចក្តីសម្រេចចិត្ត មិនមែនគ្រាន់តែទន្ទេញប៉ុណ្ណោះទេ។',
    projectEn: 'a simple scoring model for learner progress',
    projectKm: 'ម៉ូឌែលពិន្ទុសាមញ្ញសម្រាប់វាស់វឌ្ឍនភាពអ្នកសិក្សា',
  }),
  buildStarterCourse({
    title: t('Scientific Thinking and Inquiry', 'ការគិតបែបវិទ្យាសាស្ត្រ និងការស្រាវជ្រាវ'),
    description: t('Use observation, hypotheses, and evidence to improve decisions.', 'ប្រើការសង្កេត សន្និដ្ឋាន និងភស្តុតាងដើម្បីធ្វើឱ្យសេចក្តីសម្រេចកាន់តែប្រសើរ។'),
    category: 'Science',
    level: CourseLevel.BEGINNER,
    thumbnail: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&q=80',
    tags: ['Science', 'Inquiry', 'Evidence', 'Reasoning'],
    outcomeEn: 'The course treats science as a disciplined way of thinking, not just facts.',
    outcomeKm: 'វគ្គនេះមើលវិទ្យាសាស្ត្រជារបៀបគិតដែលមានវិន័យ មិនមែនជាការទន្ទេញ facts ប៉ុណ្ណោះទេ។',
    projectEn: 'a small evidence-based classroom experiment',
    projectKm: 'ការសាកល្បងតូចមួយផ្អែកលើភស្តុតាងក្នុងថ្នាក់រៀន',
  }),
  buildStarterCourse({
    title: t('Business Strategy Essentials', 'មូលដ្ឋានគ្រឹះយុទ្ធសាស្ត្រអាជីវកម្ម'),
    description: t('Learn how teams align goals, customers, and execution.', 'រៀនពីរបៀបដែលក្រុមភ្ជាប់គោលដៅ អតិថិជន និងការអនុវត្តជាមួយគ្នា។'),
    category: 'Business',
    level: CourseLevel.BEGINNER,
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
    tags: ['Business', 'Strategy', 'Execution', 'Leadership'],
    outcomeEn: 'You will move from abstract strategy language to practical planning decisions.',
    outcomeKm: 'អ្នកនឹងផ្លាស់ពីពាក្យយុទ្ធសាស្ត្របែបអរូបីទៅសេចក្តីសម្រេចផែនការដែលអនុវត្តបាន។',
    projectEn: 'a launch plan for a new school service',
    projectKm: 'ផែនការបញ្ចេញសេវាកម្មថ្មីមួយសម្រាប់សាលារៀន',
  }),
  buildStarterCourse({
    title: t('Technology Literacy for Modern Teams', 'ជំនាញយល់ដឹងបច្ចេកវិទ្យាសម្រាប់ក្រុមសម័យថ្មី'),
    description: t('Build confidence navigating common digital systems and decisions.', 'បង្កើតទំនុកចិត្តក្នុងការប្រើប្រាស់ប្រព័ន្ធឌីជីថល និងការសម្រេចចិត្តទូទៅ។'),
    category: 'Technology',
    level: CourseLevel.ALL_LEVELS,
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    tags: ['Technology', 'Digital Skills', 'Systems', 'Productivity'],
    outcomeEn: 'The course helps non-specialists speak clearly about modern technology tradeoffs.',
    outcomeKm: 'វគ្គនេះជួយអ្នកមិនមែនជាជំនាញបច្ចេកទេសនិយាយអំពី tradeoffs នៃបច្ចេកវិទ្យាទំនើបបានច្បាស់។',
    projectEn: 'a digital improvement plan for an operations team',
    projectKm: 'ផែនការកែលម្អឌីជីថលសម្រាប់ក្រុមប្រតិបត្តិការ',
  }),
  buildStarterCourse({
    title: t('Personal Growth and Learning Systems', 'ការអភិវឌ្ឍខ្លួន និងប្រព័ន្ធសិក្សារបស់ខ្លួន'),
    description: t('Create better habits, reflection loops, and personal execution systems.', 'បង្កើតទម្លាប់ល្អ ការឆ្លុះបញ្ចាំង និងប្រព័ន្ធអនុវត្តផ្ទាល់ខ្លួនឱ្យប្រសើរ។'),
    category: 'Personal Development',
    level: CourseLevel.ALL_LEVELS,
    thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=80',
    tags: ['Growth', 'Habits', 'Reflection', 'Learning'],
    outcomeEn: 'You will design routines that make improvement sustainable over time.',
    outcomeKm: 'អ្នកនឹងរចនាទម្លាប់ដែលធ្វើឱ្យការកែលម្អអាចបន្តបានក្នុងរយៈពេលវែង។',
    projectEn: 'a four-week personal growth plan',
    projectKm: 'ផែនការអភិវឌ្ឍខ្លួនរយៈពេលបួនសប្តាហ៍',
  }),
];

const createCourseRecord = async (instructorId: string, blueprint: CourseBlueprint) => {
  const existingCourse = await prisma.course.findFirst({
    where: { title: blueprint.title.base },
    select: { id: true },
  });

  if (existingCourse) {
    console.log(`⏭️  Skipping existing course: ${blueprint.title.base}`);
    return;
  }

  const totalLessons = blueprint.sections.reduce((count, section) => count + section.lessons.length, 0);
  const totalDuration = blueprint.sections
    .flatMap((section) => section.lessons)
    .reduce((sum, lesson) => sum + lesson.duration, 0);

  const course = await prisma.course.create({
    data: {
      title: blueprint.title.base,
      description: blueprint.description.base,
      titleTranslations: blueprint.title.translations,
      descriptionTranslations: blueprint.description.translations,
      thumbnail: blueprint.thumbnail,
      category: blueprint.category,
      level: blueprint.level,
      status: 'PUBLISHED',
      duration: totalDuration,
      lessonsCount: totalLessons,
      price: 0,
      isFree: true,
      isFeatured: Boolean(blueprint.isFeatured),
      isPublished: true,
      instructorId,
      tags: blueprint.tags,
      rating: blueprint.rating ?? 4.7,
      reviewsCount: blueprint.reviewsCount ?? 0,
      enrolledCount: blueprint.enrolledCount ?? 120,
    },
  });

  let lessonOrder = 1;

  for (let sectionIndex = 0; sectionIndex < blueprint.sections.length; sectionIndex += 1) {
    const sectionBlueprint = blueprint.sections[sectionIndex];
    const section = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: sectionBlueprint.title.base,
        description: sectionBlueprint.description?.base || null,
        titleTranslations: sectionBlueprint.title.translations,
        descriptionTranslations: sectionBlueprint.description?.translations,
        order: sectionIndex + 1,
      },
    });

    for (const lessonBlueprint of sectionBlueprint.lessons) {
      await prisma.lesson.create({
        data: {
          courseId: course.id,
          sectionId: section.id,
          type: lessonBlueprint.type,
          title: lessonBlueprint.title.base,
          description: lessonBlueprint.description?.base || null,
          content: lessonBlueprint.content?.base || null,
          titleTranslations: lessonBlueprint.title.translations,
          descriptionTranslations: lessonBlueprint.description?.translations,
          contentTranslations: lessonBlueprint.content?.translations,
          videoUrl: lessonBlueprint.videoUrl || null,
          duration: lessonBlueprint.duration,
          order: lessonOrder,
          isFree: lessonBlueprint.isFree,
          isPublished: true,
          quiz: lessonBlueprint.quiz ? {
            create: {
              passingScore: lessonBlueprint.quiz.passingScore ?? 80,
              questions: {
                create: lessonBlueprint.quiz.questions.map((question, questionIndex) => ({
                  question: question.question,
                  explanation: question.explanation || null,
                  order: questionIndex + 1,
                  options: {
                    create: question.options,
                  },
                })),
              },
            },
          } : undefined,
          assignment: lessonBlueprint.assignment ? {
            create: {
              instructions: lessonBlueprint.assignment.instructions.base,
              instructionsTranslations: lessonBlueprint.assignment.instructions.translations,
              rubric: lessonBlueprint.assignment.rubric?.base || null,
              rubricTranslations: lessonBlueprint.assignment.rubric?.translations,
              maxScore: lessonBlueprint.assignment.maxScore ?? 100,
              passingScore: lessonBlueprint.assignment.passingScore ?? 80,
            },
          } : undefined,
          exercise: lessonBlueprint.exercise ? {
            create: {
              language: lessonBlueprint.exercise.language,
              initialCode: lessonBlueprint.exercise.initialCode,
              solution: lessonBlueprint.exercise.solution || null,
              testCases: lessonBlueprint.exercise.testCases || null,
            },
          } : undefined,
        },
      });

      lessonOrder += 1;
    }
  }

  console.log(`✅ Seeded course: ${blueprint.title.base}`);
};

const resetLearningCatalog = async () => {
  const [courseCount, pathCount] = await Promise.all([
    prisma.course.count(),
    prisma.learningPath.count(),
  ]);

  console.log(`🧹 Replace mode enabled. Removing ${courseCount} existing courses and ${pathCount} learning paths...`);

  await prisma.$transaction(async (tx) => {
    await tx.pathEnrollment.deleteMany();
    await tx.learningPathCourse.deleteMany();
    await tx.learningPath.deleteMany();
    await tx.course.deleteMany();
  });

  console.log('✅ Existing learning catalog removed. School data was not touched.');
};

async function main() {
  console.log('🌱 Seeding production-ready multilingual courses...');

  if (shouldReplaceExisting) {
    await resetLearningCatalog();
  }

  const instructor =
    await prisma.user.findFirst({ where: { role: 'TEACHER' } })
    || await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    || await prisma.user.findFirst();

  if (!instructor) {
    console.log('❌ No instructor-capable user found. Seed a user first.');
    return;
  }

  console.log(`👤 Using instructor: ${instructor.firstName} ${instructor.lastName}`);

  for (const blueprint of [...flagshipCourses, ...catalogCourses]) {
    await createCourseRecord(instructor.id, blueprint);
  }

  console.log(`🎉 Finished seeding ${flagshipCourses.length + catalogCourses.length} multilingual courses.`);
}

main()
  .catch((error) => {
    console.error('❌ Failed to seed real courses:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
