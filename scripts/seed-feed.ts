import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedFeed() {
    console.log('🌱 Seeding feed demo data...\n');

    const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

    // Find any available school (flexible — works regardless of school name)
    const school = await prisma.school.findFirst();
    if (school) {
        console.log(`✅ Found school: ${school.name}`);
    } else {
        console.log('⚠️  No school found — users will be created without schoolId');
    }

    // ─── 1. Create Demo Users ─────────────────────────────────────────────────
    console.log('👤 Creating demo users...');

    const demoUsers = [
        {
            email: 'emma.wilson@testhighschool.edu',
            firstName: 'Emma',
            lastName: 'Wilson',
            role: 'TEACHER' as const,
            bio: 'Math teacher & lifelong learner. Love making complex concepts simple! 📐',
            headline: 'Senior Mathematics Teacher | STEM Enthusiast',
            profilePictureUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Emma&backgroundColor=b6e3f4',
            interests: ['Mathematics', 'STEM', 'Problem Solving', 'Calculus'],
            skills: ['Calculus', 'Linear Algebra', 'Statistics', 'Python'],
        },
        {
            email: 'alex.chen@testhighschool.edu',
            firstName: 'Alex',
            lastName: 'Chen',
            role: 'STUDENT' as const,
            bio: 'CS student, competitive programmer, coffee addict ☕. Building the future one line at a time.',
            headline: 'Grade 11 | Computer Science & Math',
            profilePictureUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Alex&backgroundColor=c0aede',
            interests: ['Programming', 'Algorithms', 'Machine Learning', 'Gaming'],
            skills: ['Python', 'JavaScript', 'C++', 'React'],
        },
        {
            email: 'sarah.kim@testhighschool.edu',
            firstName: 'Sarah',
            lastName: 'Kim',
            role: 'STUDENT' as const,
            bio: 'Biology nerd & future doctor 🔬. Ask me anything about cells!',
            headline: 'Grade 12 | Science Track',
            profilePictureUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Sarah&backgroundColor=ffdfbf',
            interests: ['Biology', 'Chemistry', 'Medicine', 'Research'],
            skills: ['Biology', 'Chemistry', 'Lab Techniques', 'Data Analysis'],
        },
        {
            email: 'james.patel@testhighschool.edu',
            firstName: 'James',
            lastName: 'Patel',
            role: 'TEACHER' as const,
            bio: 'Physics teacher with 10 years experience. Making waves in education 🌊',
            headline: 'Physics & Science Teacher | Research Background',
            profilePictureUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=James&backgroundColor=d1d4f9',
            interests: ['Physics', 'Quantum Mechanics', 'Astronomy', 'Science Communication'],
            skills: ['Physics', 'Thermodynamics', 'Electromagnetism', 'Research'],
        },
        {
            email: 'mia.johnson@testhighschool.edu',
            firstName: 'Mia',
            lastName: 'Johnson',
            role: 'STUDENT' as const,
            bio: 'Aspiring engineer & robotics club president 🤖. Learning = growing!',
            headline: 'Grade 12 | Engineering Track',
            profilePictureUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Mia&backgroundColor=ffd5dc',
            interests: ['Engineering', 'Robotics', 'Physics', '3D Printing'],
            skills: ['CAD Design', 'Arduino', 'Python', 'Project Management'],
        },
        {
            email: 'liam.nguyen@testhighschool.edu',
            firstName: 'Liam',
            lastName: 'Nguyen',
            role: 'STUDENT' as const,
            bio: 'Data science enthusiast 📊. Turning numbers into insight.',
            headline: 'Grade 11 | Math & Stats',
            profilePictureUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Liam&backgroundColor=b6e3f4',
            interests: ['Data Science', 'Statistics', 'Machine Learning', 'Visualization'],
            skills: ['Python', 'Pandas', 'SQL', 'Tableau'],
        },
        {
            email: 'sofia.garcia@testhighschool.edu',
            firstName: 'Sofia',
            lastName: 'Garcia',
            role: 'TEACHER' as const,
            bio: 'English & Literature teacher. Words are my superpower ✍️',
            headline: 'English Teacher | Creative Writing Coach',
            profilePictureUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Sofia&backgroundColor=c0aede',
            interests: ['Literature', 'Creative Writing', 'Linguistics', 'Public Speaking'],
            skills: ['Creative Writing', 'Essay Coaching', 'Public Speaking', 'Grammar'],
        },
        {
            email: 'noah.brown@testhighschool.edu',
            firstName: 'Noah',
            lastName: 'Brown',
            role: 'STUDENT' as const,
            bio: 'Artist + programmer = creative technologist 🎨💻',
            headline: 'Grade 10 | Arts & Technology',
            profilePictureUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=Noah&backgroundColor=ffdfbf',
            interests: ['Digital Art', 'UI/UX Design', 'Web Development', 'Photography'],
            skills: ['Figma', 'HTML/CSS', 'Photoshop', 'JavaScript'],
        },
    ];

    const createdUsers: any[] = [];

    for (const userData of demoUsers) {
        const existing = await prisma.user.findFirst({
            where: { email: userData.email },
        });

        if (existing) {
            console.log(`  ⏭️  ${userData.firstName} ${userData.lastName} already exists`);
            createdUsers.push(existing);
        } else {
            const user = await prisma.user.create({
                data: {
                    schoolId: school?.id,
                    email: userData.email,
                    password: hashedPassword,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    role: userData.role,
                    isActive: true,
                    isDefaultPassword: false,
                    bio: userData.bio,
                    headline: userData.headline,
                    profilePictureUrl: userData.profilePictureUrl,
                    interests: userData.interests,
                    skills: userData.skills,
                    isEmailVerified: true,
                    profileCompleteness: 85,
                },
            });
            console.log(`  ✅ Created ${user.firstName} ${user.lastName} (${user.role})`);
            createdUsers.push(user);
        }
    }

    // ─── 2. Create Feed Posts ─────────────────────────────────────────────────
    console.log('\n📝 Creating feed posts...');

    const [emma, alex, sarah, james, mia, liam, sofia, noah] = createdUsers;

    const postsData = [
        // ARTICLE posts
        {
            authorId: emma.id,
            content: '🧮 Struggling with integration by parts? Here\'s my 3-step method that never fails:\n\n1️⃣ Identify u and dv (LIATE: Log, Inverse trig, Algebraic, Trig, Exponential)\n2️⃣ Apply the formula: ∫u dv = uv − ∫v du\n3️⃣ Repeat if needed\n\nExample: ∫x·eˣ dx\n→ u = x, dv = eˣ dx\n→ du = dx, v = eˣ\n→ = xeˣ − ∫eˣ dx = xeˣ − eˣ + C ✅\n\nSave this post for your next exam! 📌',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Mathematics', 'Calculus', 'StudyTips'],
            likesCount: 47,
            commentsCount: 12,
            sharesCount: 8,
        },
        {
            authorId: alex.id,
            content: '🔥 Just solved my first Dynamic Programming problem on LeetCode without looking at hints!\n\nThe key insight for DP: think about what the SUBPROBLEM is, not just the final answer.\n\nFor Fibonacci:\n- Naive recursion: O(2ⁿ) — terrible\n- Memoization: O(n) — sweet!\n\nIf you\'re learning algorithms, start with "climbing stairs" problem. Simple enough to see the pattern, powerful enough to cement the concept. 💪\n\n#Algorithms #CompSci #LeetCode',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Programming', 'Algorithms', 'ComputerScience'],
            likesCount: 63,
            commentsCount: 18,
            sharesCount: 15,
        },
        {
            authorId: sarah.id,
            content: '🔬 PSA for anyone doing PCR in the lab today:\n\nDon\'t forget to include your NEGATIVE CONTROL. I made this mistake last semester — ran 40 samples and had no idea if my results were contamination or actual signal.\n\nPositive control ✅ — confirms the reaction works\nNegative control ✅ — confirms no contamination\nExperimental samples ✅\n\nThis saves you from repeating days of work. Learn from my pain 😭',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Biology', 'Lab', 'Science', 'StudyTips'],
            mediaUrls: ['https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80'],
            likesCount: 39,
            commentsCount: 7,
            sharesCount: 5,
        },
        {
            authorId: james.id,
            content: 'MIND = BLOWN 🤯\n\nDid you know that technically YOU are older at your feet than at your head?\n\nEinstein\'s general relativity says time passes SLOWER in stronger gravitational fields. Your feet are closer to Earth\'s core — so they experience a slightly stronger gravitational field.\n\nOver a lifetime, your feet are about 90 nanoseconds younger than your head.\n\nPhysics is wild. What\'s your favorite mind-bending physics concept?',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Physics', 'Relativity', 'Science', 'FunFacts'],
            likesCount: 128,
            commentsCount: 34,
            sharesCount: 42,
        },
        {
            authorId: mia.id,
            content: '🤖 Our robotics team just won the regional tournament!\n\nAfter 3 months of:\n— Late nights in the lab\n— 100+ prototype iterations  \n— 2 complete redesigns\n— Countless failed test runs\n\nWe finally nailed the autonomous navigation sequence. The robot completed the obstacle course in 4.2 seconds — 0.3s faster than 2nd place!\n\nHumble brag: I designed the pathfinding algorithm 😊\n\nBIG thank you to Mr. Patel for all the physics advice! 🙏',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Robotics', 'Engineering', 'STEM'],
            mediaUrls: ['https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80'],
            likesCount: 211,
            commentsCount: 45,
            sharesCount: 28,
        },
        {
            authorId: liam.id,
            content: 'Python one-liner that will make your life 10x easier:\n\n```python\n# Count word frequency in ANY text 🚀\nfrom collections import Counter\n\ntext = "the quick brown fox jumps over the lazy dog"\nfreq = Counter(text.split())\nprint(freq.most_common(3))\n# → [(\'the\', 2), (\'quick\', 1), (\'brown\', 1)]\n```\n\nI used this for my data analysis project and went from 15 lines of code to 3. Collections module is criminally underrated. 📊',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Python', 'DataScience', 'Programming', 'Tips'],
            likesCount: 87,
            commentsCount: 21,
            sharesCount: 33,
        },
        {
            authorId: sofia.id,
            content: '✍️ The #1 mistake students make in essay writing:\n\nStarting with "In today\'s society..." or "Since the dawn of time..."\n\nThese openers are immediately forgettable.\n\nInstead, try:\n→ A provocative question: "What if everything we know about X is wrong?"\n→ A counter-intuitive fact: "Despite 10 years of research, Y still has no proven cure"\n→ A vivid scene: Put the reader inside a moment\n\nYour first sentence should earn the second. Your reader\'s attention is borrowed, not given.\n\nSave this for your next English essay 🎯',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['English', 'Writing', 'StudyTips', 'Essays'],
            likesCount: 92,
            commentsCount: 16,
            sharesCount: 24,
        },
        {
            authorId: noah.id,
            content: '🎨 Just redesigned our school app concept in Figma — took me all weekend!\n\nKey design decisions:\n→ High contrast colors for accessibility\n→ Large touch targets (min 44px) for mobile\n→ Consistent 8px grid system\n→ Micro-animations on every interaction\n\nFun fact: 94% of first impressions are design-related. Before users read a word, they\'ve already judged your app.\n\nDropping the full case study next week. Stay tuned! 🔔',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['UIDesign', 'Figma', 'Technology', 'Design'],
            mediaUrls: ['https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80'],
            likesCount: 74,
            commentsCount: 19,
            sharesCount: 11,
        },

        // QUESTION posts
        {
            authorId: alex.id,
            content: 'Can someone explain to me why O(n log n) is considered the "best possible" sorting complexity? Why can\'t we do O(n)?\n\nI know about Radix sort being O(n) but my teacher said that\'s cheating because it\'s not comparison-based. Why does comparison-based matter? 🤔',
            postType: 'QUESTION',
            visibility: 'PUBLIC',
            topicTags: ['Algorithms', 'ComputerScience', 'SortingAlgorithms'],
            likesCount: 15,
            commentsCount: 9,
            sharesCount: 2,
        },
        {
            authorId: sarah.id,
            content: 'Help! I have my Biology practical next week and I\'m confused about the difference between meiosis I and meiosis II.\n\nI keep mixing up what happens at each stage. Is there a simple way to remember which division separates homologous chromosomes vs sister chromatids?\n\n🙏 Would really appreciate someone eli12 (explain like I\'m 12)',
            postType: 'QUESTION',
            visibility: 'PUBLIC',
            topicTags: ['Biology', 'CellDivision', 'Meiosis', 'StudyHelp'],
            likesCount: 22,
            commentsCount: 11,
            sharesCount: 4,
        },

        // POLL posts
        {
            authorId: james.id,
            title: '⚡ Physics Revision Poll',
            content: 'Which Physics topic do you find MOST challenging? I\'m planning my revision sessions for next month and want to focus where students need the most help!',
            postType: 'POLL',
            visibility: 'PUBLIC',
            topicTags: ['Physics', 'Revision', 'Poll'],
            likesCount: 18,
            commentsCount: 6,
            sharesCount: 3,
        },
        {
            authorId: emma.id,
            title: '📚 Study Session Preference',
            content: 'Quick poll for my students! When do you prefer to have extra math support sessions?',
            postType: 'POLL',
            visibility: 'PUBLIC',
            topicTags: ['Mathematics', 'StudySession', 'Poll'],
            likesCount: 29,
            commentsCount: 4,
            sharesCount: 1,
        },

        // RESOURCE posts
        {
            authorId: liam.id,
            title: 'Free Python Data Science Cheatsheet 2025',
            content: '📊 Sharing my comprehensive Python cheatsheet for data science that I\'ve been building all year.\n\nCovers:\n• NumPy array operations\n• Pandas DataFrame methods\n• Matplotlib plotting essentials\n• Scikit-learn model pipeline\n• SQL-style operations with Pandas\n\nSaved me hours in my last data project. Hope it helps you too! 🙌',
            postType: 'RESOURCE',
            visibility: 'PUBLIC',
            topicTags: ['Python', 'DataScience', 'Resources', 'Cheatsheet'],
            likesCount: 143,
            commentsCount: 27,
            sharesCount: 68,
        },
        {
            authorId: sofia.id,
            title: 'Essay Writing Framework — The "PEEL" Method',
            content: '✍️ After 8 years of grading essays, here\'s the structure that earns top marks every time:\n\n**P** — Point: State your argument clearly\n**E** — Evidence: Quote or reference your source\n**E** — Explain: Analyze how the evidence supports your point\n**L** — Link: Connect back to the thesis / intro to the next point\n\nPrint this out. Tape it to your desk. Thank me in exam season. 📌',
            postType: 'RESOURCE',
            visibility: 'PUBLIC',
            topicTags: ['English', 'Writing', 'Essays', 'StudyTips', 'Resources'],
            likesCount: 98,
            commentsCount: 13,
            sharesCount: 41,
        },

        // More ARTICLE with images
        {
            authorId: james.id,
            content: '🌌 Sharing something that gives me chills every time I think about it:\n\nThe Pale Blue Dot.\n\nIn 1990, Voyager 1 was 6 billion kilometers from Earth. Carl Sagan asked NASA to turn the camera around. This is what it saw.\n\nOur entire planet — every war ever fought, every king who ever lived, every human thought — is a fraction of a single pixel.\n\n"There is perhaps no better demonstration of the folly of human conceits than this distant image of our tiny world." — Carl Sagan\n\nPut your problems in perspective today. 💙',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Physics', 'Astronomy', 'Inspiration', 'Science'],
            mediaUrls: ['https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80'],
            likesCount: 334,
            commentsCount: 56,
            sharesCount: 89,
        },
        {
            authorId: mia.id,
            content: 'Step-by-step breakdown of how I built my first PCB (printed circuit board) for our robotics project 🔧\n\nTools needed:\n→ EasyEDA (free online PCB design)\n→ JLCPCB for manufacturing (super cheap for students)\n→ Soldering iron + solder\n→ Multimeter for testing\n\nHardest part: getting the trace widths right for high-current paths. Burned through 2 prototypes before getting it right 😅\n\nTotal cost: ~$12 for 5 boards shipped. Mind blown.',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Engineering', 'Electronics', 'Robotics', 'DIY'],
            mediaUrls: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80'],
            likesCount: 156,
            commentsCount: 31,
            sharesCount: 22,
        },
        {
            authorId: noah.id,
            content: 'Hot take: CSS Grid is better than Flexbox for 80% of layouts.\n\nFlex = 1D layouts (row OR column)\nGrid = 2D layouts (row AND column)\n\nMost modern layouts are 2D. Stop fighting CSS Grid — it\'s your friend 😤\n\n```css\n.layout {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 1rem;\n}\n```\n\nThis single snippet creates a responsive card layout that works on ANY screen size. You\'re welcome 🎁',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['WebDev', 'CSS', 'Programming', 'Frontend'],
            likesCount: 201,
            commentsCount: 44,
            sharesCount: 67,
        },
        {
            authorId: emma.id,
            content: '📐 MATH TRICK that blew my students\' minds today:\n\nMultiplying by 9 using your fingers!\n\n1. Hold up all 10 fingers\n2. To calculate 9 × n, fold down finger number n\n3. Fingers to the LEFT = tens digit\n4. Fingers to the RIGHT = units digit\n\n9 × 7:\n→ Fold down finger 7\n→ Left: 6 fingers / Right: 3 fingers\n→ Answer: 63 ✅\n\nWorks for 9×1 through 9×10. Screenshot this and show a friend — let me know their reaction! 😄',
            postType: 'ARTICLE',
            visibility: 'PUBLIC',
            topicTags: ['Mathematics', 'MathTricks', 'FunLearning', 'Tips'],
            likesCount: 287,
            commentsCount: 63,
            sharesCount: 104,
        },
    ];

    let postCount = 0;
    for (const postData of postsData) {
        const { likesCount, commentsCount, sharesCount, ...data } = postData;
        const existing = await prisma.post.findFirst({
            where: {
                authorId: postData.authorId,
                content: { startsWith: postData.content.substring(0, 50) },
            },
        });

        if (existing) {
            console.log(`  ⏭️  Post already exists: "${postData.content.substring(0, 40)}..."`);
            continue;
        }

        await prisma.post.create({
            data: {
                ...data,
                mediaUrls: (data as any).mediaUrls || [],
                mediaKeys: [],
                likesCount: likesCount || 0,
                commentsCount: commentsCount || 0,
                sharesCount: sharesCount || 0,
                trendingScore: (likesCount || 0) * 0.4 + (commentsCount || 0) * 0.3 + (sharesCount || 0) * 0.3,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random within last 7 days
            },
        });

        postCount++;
        console.log(`  ✅ Post ${postCount}: "${postData.content.substring(0, 45)}..."`);
    }

    // ─── 3. Make users follow each other ─────────────────────────────────────
    console.log('\n👥 Creating follow relationships...');

    const followPairs = [
        [alex.id, emma.id],
        [alex.id, james.id],
        [sarah.id, james.id],
        [sarah.id, emma.id],
        [mia.id, james.id],
        [liam.id, alex.id],
        [liam.id, emma.id],
        [noah.id, alex.id],
        [noah.id, mia.id],
        [emma.id, james.id],
        [james.id, emma.id],
        [sofia.id, emma.id],
    ];

    for (const [followerId, followingId] of followPairs) {
        try {
            const existing = await prisma.follow.findFirst({
                where: { followerId, followingId },
            });
            if (!existing) {
                await prisma.follow.create({ data: { followerId, followingId } });
            }
        } catch (_e) {
            // Follow model might not exist — skip silently
        }
    }

    console.log('  ✅ Follow relationships created');

    // ─── 4. Summary ───────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FEED SEED COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  👤 ${createdUsers.length} demo users`);
    console.log(`  📝 ${postCount} new posts`);
    console.log('');
    console.log('📱 Open the app and scroll the feed to see:');
    console.log('   → Posts by different users');
    console.log('   → SUGGESTED_USERS carousel (after post #6)');
    console.log('   → SUGGESTED_COURSES carousel (after post #14)');
    console.log('');
    console.log('🔑 All demo users use: SecurePass123!');
}

seedFeed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
