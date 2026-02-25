import { PrismaClient, PostType } from '@prisma/client';

export function startGamificationJobs(prisma: PrismaClient) {
    const runBackgroundJobs = process.env.DISABLE_BACKGROUND_JOBS !== 'true';
    if (!runBackgroundJobs) return;

    console.log('🚀 [GamificationJobs] Starting background jobs...');

    // ─── Hourly: Recalculate post difficulty scores ────────────────────
    setInterval(async () => {
        try {
            await updatePostDifficulties(prisma);
        } catch (err) {
            console.error('❌ [GamificationJobs] Hourly difficulty update error:', err);
        }
    }, 60 * 60 * 1000); // 1 hour

    // ─── Daily: Update User Academic Levels & Topics ───────────────────
    setInterval(async () => {
        try {
            await updateUserAcademicProfiles(prisma);
        } catch (err) {
            console.error('❌ [GamificationJobs] Daily academic profile update error:', err);
        }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Run initial passes (staggered)
    setTimeout(() => updatePostDifficulties(prisma), 10 * 1000); // 10s delay
    setTimeout(() => updateUserAcademicProfiles(prisma), 30 * 1000); // 30s delay
}

async function updatePostDifficulties(prisma: PrismaClient) {
    console.log('🔄 [GamificationJobs] Running post difficulty updates...');

    // Base difficulty mapped by PostType
    const difficultyMap: Partial<Record<PostType, number>> = {
        QUESTION: 2.0,
        TUTORIAL: 2.5,
        QUIZ: 3.0,
        COURSE: 3.0,
        RESEARCH: 4.5,
        EXAM: 4.0,
        ASSIGNMENT: 3.5,
        PROJECT: 4.0,
        ARTICLE: 2.5,
        POLL: 1.5,
        RESOURCE: 2.5,
    };

    // Get recent posts using raw SQL or Prisma updates
    // For now, we will just sync the base difficulty so the field isn't null.
    // In a real ML pipeline, this would look at engagement pass/fail rates.
    const posts = await prisma.post.findMany({
        where: {
            difficultyLevel: null
        },
        select: { id: true, postType: true },
        take: 500,
    });

    if (posts.length === 0) return;

    const ops = posts.map(post =>
        prisma.post.update({
            where: { id: post.id },
            data: { difficultyLevel: difficultyMap[post.postType] || 2.5 },
        })
    );

    // Batch update
    for (let i = 0; i < ops.length; i += 100) {
        await prisma.$transaction(ops.slice(i, i + 100));
    }

    console.log(`✅ [GamificationJobs] Initialized difficulty for ${posts.length} posts.`);
}

async function updateUserAcademicProfiles(prisma: PrismaClient) {
    console.log('🔄 [GamificationJobs] Running user academic profile updates...');

    // Gather users active in the last 7 days from attempting quizzes
    const recentAttempts = await prisma.quizAttempt.findMany({
        where: { submittedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { userId: true },
        distinct: ['userId'],
        take: 500,
    });

    for (const { userId } of recentAttempts) {
        try {
            // Get their 20 most recent scores
            const userScores = await prisma.quizAttempt.findMany({
                where: { userId, submittedAt: { not: null } },
                select: { score: true, quiz: { select: { totalPoints: true, post: { select: { topicTags: true } } } } },
                take: 20,
                orderBy: { submittedAt: 'desc' },
            });

            if (userScores.length === 0) continue;

            let totalPercentage = 0;
            const topicScores: Record<string, { total: number; max: number }> = {};

            for (const attempt of userScores) {
                if (!attempt.quiz || !attempt.quiz.totalPoints || attempt.quiz.totalPoints === 0) continue;
                const pct = attempt.score / attempt.quiz.totalPoints;
                totalPercentage += pct;

                // Aggregate by topic
                const tags = attempt.quiz.post?.topicTags || [];
                for (const tag of tags) {
                    const t = tag.toLowerCase();
                    if (!topicScores[t]) topicScores[t] = { total: 0, max: 0 };
                    topicScores[t].total += attempt.score;
                    topicScores[t].max += attempt.quiz.totalPoints;
                }
            }

            const avgPercentage = totalPercentage / userScores.length;
            // Map 0-100% to 1.0 - 5.0 scale
            const currentLevel = 1.0 + (avgPercentage * 4.0);

            // Identify weak/strong topics
            const weakTopics: string[] = [];
            const strongTopics: string[] = [];
            for (const [topic, stats] of Object.entries(topicScores)) {
                if (stats.max === 0) continue;
                const topicPct = stats.total / stats.max;
                if (topicPct < 0.6) weakTopics.push(topic);       // < 60% = weak
                else if (topicPct > 0.85) strongTopics.push(topic); // > 85% = strong
            }

            await prisma.userAcademicProfile.upsert({
                where: { userId },
                create: {
                    userId,
                    currentLevel,
                    weakTopics,
                    strongTopics,
                    lastUpdated: new Date()
                },
                update: {
                    currentLevel,
                    weakTopics,
                    strongTopics,
                    lastUpdated: new Date()
                }
            });

        } catch (err) {
            console.error(`❌ [GamificationJobs] Error updating academic profile for user ${userId}:`, err);
        }
    }

    console.log(`✅ [GamificationJobs] Processed academic profiles for ${recentAttempts.length} users.`);
}
