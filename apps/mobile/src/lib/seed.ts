import { supabase } from './supabase';
import { mockPosts } from '../api/mockData';

export const seedDatabase = async () => {
    console.log('🌱 Starting Data Migration...');

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            console.error('❌ You must be logged in to seed the database (RLS policy).');
            return;
        }

        const userId = session.user.id;
        console.log('👤 Seeding as user:', userId);

        // 1. Seed Posts
        for (const post of mockPosts) {
            const { data: newPost, error } = await supabase
                .from('posts')
                .insert({
                    author_id: userId, // Use current user as author
                    content: post.content,
                    post_type: post.postType,
                    media_urls: post.mediaUrls || [],
                    likes_count: post.likes,
                    comments_count: post.comments,
                    shares_count: post.shares,
                    views_count: 0,
                    created_at: post.createdAt,
                    title: post.title,
                })
                .select()
                .single();

            if (error) {
                console.error('Error migrating post:', error.message);
            } else {
                console.log(`✅ Migrated post: ${post.id} -> ${newPost.id}`);

                // 2. Seed Quiz data if post is a QUIZ
                if (post.postType === 'QUIZ' && post.quizData) {
                    await seedQuiz(newPost.id, post.quizData);
                }
            }
        }

        console.log('✨ Migration Complete!');
    } catch (err) {
        console.error('Migration failed:', err);
    }
};

const seedQuiz = async (postId: string, quizData: any) => {
    try {
        // Create Quiz
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .insert({
                post_id: postId,
                title: quizData.title || 'Untitled Quiz',
                description: quizData.description,
                time_limit: quizData.timeLimit,
                passing_score: quizData.passingScore,
                total_points: quizData.totalPoints,
            })
            .select()
            .single();

        if (quizError || !quiz) {
            console.error('Failed to create quiz:', quizError);
            return;
        }

        console.log(`  📝 Created Quiz: ${quiz.id}`);

        // Create Questions
        if (quizData.questions) {
            for (const q of quizData.questions) {
                const { data: question, error: qError } = await supabase
                    .from('quiz_questions')
                    .insert({
                        quiz_id: quiz.id,
                        text: q.text,
                        type: q.type || 'MULTIPLE_CHOICE',
                        points: q.points,
                        "order": q.order || 0,
                    })
                    .select()
                    .single();

                if (qError || !question) {
                    console.error('Failed to create question:', qError);
                    continue;
                }

                // Create Options
                if (q.options) {
                    const optionsToInsert = q.options.map((opt: any) => ({
                        question_id: question.id,
                        text: opt.text,
                        is_correct: opt.isCorrect,
                    }));

                    const { error: optError } = await supabase
                        .from('quiz_question_options')
                        .insert(optionsToInsert);

                    if (optError) console.error('Failed to insert options:', optError);
                }
            }
        }
    } catch (error) {
        console.error('Error seeding quiz:', error);
    }
};
