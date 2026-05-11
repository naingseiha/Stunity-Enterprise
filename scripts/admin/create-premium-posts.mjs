import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const postsData = [
  {
    title: 'សិល្បៈនៃការសរសេរកូដ (The Art of Programming)',
    content: `ការសរសេរកូដមិនមែនគ្រាន់តែជាការវាយអត្ថបទឱ្យកុំព្យូទ័រយល់នោះទេ ប៉ុន្តែវាគឺជាសិល្បៈនៃការដោះស្រាយបញ្ហា និងការបង្កើតអ្វីដែលថ្មីពីគំនិត។ 💻✨

នៅក្នុងពិភពបច្ចេកវិទ្យាទំនើប ចំណេះដឹងផ្នែក Programming គឺជា "Superpower" មួយដែលអនុញ្ញាតឱ្យយើងបង្កើតដំណោះស្រាយសម្រាប់បញ្ហាធំៗក្នុងសង្គម។ មិនថាអ្នកជាអ្នកចាប់ផ្តើមដំបូង ឬអ្នកជំនាញនោះទេ អ្វីដែលសំខាន់បំផុតគឺ "Logic" និង "Creativity"។

តើអ្នកយល់យ៉ាងណាដែរចំពោះការរៀនសរសេរកូដនៅកម្ពុជាបច្ចុប្បន្ន? 🤔

#Programming #TechCambodia #CodeArt #StunityLearning #SoftwareDevelopment`,
    postType: 'ARTICLE',
    topicTags: ['Programming', 'Technology', 'SelfImprovement'],
    mediaUrls: ['https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1000&auto=format&fit=crop'],
    mediaMetadata: { width: 1000, height: 1500 }, // Portrait
    mediaAspectRatio: 0.67
  },
  {
    title: 'វិទ្យាសាស្ត្រ និងការស្វែងយល់ពីចក្រវាល (Science & Exploration)',
    content: `វិទ្យាសាស្ត្រគឺជាពន្លឺដែលនាំយើងទៅកាន់ការយល់ដឹងពីអ្វីដែលមើលមិនឃើញ។ 🌌🔬

ចាប់ពីអាតូមតូចៗ រហូតដល់កាឡាក់ស៊ីដ៏ធំល្វឹងល្វើយ វិទ្យាសាស្ត្រជួយឱ្យយើងបកស្រាយអាថ៌កំបាំងនៃធម្មជាតិ។ ការចង់ដឹងចង់ឃើញ (Curiosity) គឺជាម៉ាស៊ីនរុញច្រានឱ្យមនុស្សជាតិឈានទៅមុខជានិច្ច។

សម្រាប់ប្អូនៗសិស្សានុសិស្ស ការរៀនវិទ្យាសាស្ត្រមិនមែនត្រឹមតែសម្រាប់ប្រឡងជាប់នោះទេ ប៉ុន្តែគឺដើម្បីពង្រីកវិសាលភាពនៃគំនិត និងការរស់នៅប្រកបដោយហេតុផល។ 🚀

#Science #SpaceExploration #Biology #Physics #StunityScience #FutureGen`,
    postType: 'ARTICLE',
    topicTags: ['Science', 'Education', 'Astronomy'],
    mediaUrls: ['https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=1000&auto=format&fit=crop'],
    mediaMetadata: { width: 1000, height: 1500 }, // Portrait
    mediaAspectRatio: 0.67
  }
];

async function createPremiumPosts() {
  console.log('🔍 Finding admin user...');
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
  });

  if (!admin) {
    console.error('❌ No admin user found!');
    return;
  }

  console.log('🚀 Creating Premium Posts...');

  for (const post of postsData) {
    const createdPost = await prisma.post.create({
      data: {
        authorId: admin.id,
        title: post.title,
        content: post.content,
        postType: post.postType,
        visibility: 'PUBLIC',
        topicTags: post.topicTags,
        mediaUrls: post.mediaUrls,
        mediaMetadata: post.mediaMetadata,
        mediaAspectRatio: post.mediaAspectRatio,
        mediaDisplayMode: 'AUTO',
        difficultyLevel: 2.5,
      },
    });
    console.log(`✅ Created Post: ${post.title} (ID: ${createdPost.id})`);
  }

  console.log('\n✨ All premium posts created successfully!');
}

createPremiumPosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
