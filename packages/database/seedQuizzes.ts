import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Generating Quiz Test Data...');

    // 1. Get some users
    const users = await prisma.user.findMany({ take: 10 });
    if (users.length < 2) {
        console.error('Not enough users in DB to generate data. Please create some users first.');
        return;
    }

    const creator = users[0];
    const participants = users.slice(1);

    // 2. Generate Quizzes
    const topics = ['React', 'TypeScript', 'Node.js', 'UI/UX', 'Cloud Native', 'Cybersecurity', 'Machine Learning'];

    const quizzes = [];
    for (let i = 0; i < 15; i++) {
        const topic = topics[i % topics.length];

        // Create Post for the Quiz
        const post = await prisma.post.create({
            data: {
                authorId: creator.id,
                content: `Test your knowledge on ${topic}! This is a generated quiz for testing purposes.`,
                postType: 'QUIZ',
                visibility: 'PUBLIC',
                topicTags: [topic.toLowerCase().replace(/ /g, ''), 'programming', 'tech'],
            }
        });

        const quiz = await prisma.quiz.create({
            data: {
                postId: post.id,
                timeLimit: 15,
                passingScore: 70,
                totalPoints: 30, // 10+5+15
                questions: [
                    {
                        id: "1",
                        text: `What is the primary use case for ${topic}?`,
                        type: 'MULTIPLE_CHOICE',
                        options: ['Option A', 'Option B', 'Option C', 'Option D'],
                        correctAnswer: '0',
                        points: 10,
                        orderIndex: 0,
                        explanation: `${topic} is widely used for this specific use case because of its performance advantages.`
                    },
                    {
                        id: "2",
                        text: `Is ${topic} a compiled language?`,
                        type: 'TRUE_FALSE',
                        options: [],
                        correctAnswer: 'false',
                        points: 5,
                        orderIndex: 1,
                        explanation: 'Actually it depends, but for this question we assume false.'
                    },
                    {
                        id: "3",
                        text: `Name a popular framework for ${topic}.`,
                        type: 'SHORT_ANSWER',
                        options: [],
                        correctAnswer: 'Express',
                        points: 15,
                        orderIndex: 2,
                        explanation: 'Express is the most popular framework for this stack.'
                    }
                ]
            }
        });
        quizzes.push(quiz);
        console.log(`Created quiz on ${topic}`);
    }

    // 3. Generate Attempts for the first 5 quizzes to test Analytics
    console.log('Generating attempts...');
    for (let i = 0; i < 5; i++) {
        const quiz = quizzes[i];

        for (const participant of participants) {
            // Randomize pass/fail and score
            const isPass = Math.random() > 0.3; // 70% pass rate
            const score = isPass ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 50) + 20;

            await prisma.quizAttempt.create({
                data: {
                    quizId: quiz.id,
                    userId: participant.id,
                    score: score,
                    passed: isPass,
                    pointsEarned: isPass ? 30 : 5,
                    answers: {},
                    submittedAt: new Date(Date.now() - Math.random() * 10000000000) // Random time in the past
                }
            });
        }
        console.log(`Added ${participants.length} attempts for a quiz`);
    }

    console.log('Test data generation complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
