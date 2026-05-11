import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const postsData = [
  {
    title: 'អាថ៌កំបាំង និងប្រវត្តិនៃប៉មអេហ្វែល (The Eiffel Tower)',
    content: `តើអ្នកដឹងទេថា ប៉មអេហ្វែល (Eiffel Tower) ធ្លាប់ត្រូវបានគេគ្រោងនឹងរុះរើចោលក្រោយសាងសង់រួច ២០ឆ្នាំ? 🗼🇫🇷

ប៉មដ៏ល្បីល្បាញនេះត្រូវបានសាងសង់ឡើងសម្រាប់ពិព័រណ៍ពិភពលោកឆ្នាំ ១៨៨៩ នៅទីក្រុងប៉ារីស។ ថ្វីត្បិតតែដំបូងឡើយមានការរិះគន់ពីសំណាក់អ្នកសិល្បៈខ្លះ ប៉ុន្តែឥឡូវនេះវាបានក្លាយជានិមិត្តរូបដ៏អស្ចារ្យបំផុតនៃវិស្វកម្ម និងស្ថាបត្យកម្មពិភពលោក។

ចំណុចគួរឱ្យចាប់អារម្មណ៍៖
✅ កម្ពស់ ៣៣០ ម៉ែត្រ។
✅ ប្រើប្រាស់ដែកជាង ៧,៣០០ តោន។
✅ រៀងរាល់ ៧ឆ្នាំម្តង គេត្រូវលាបថ្នាំថ្មីដែលប្រើអស់ថ្នាំដល់ទៅ ៦០ តោន!

#History #Architecture #EiffelTower #Paris #GlobalKnowledge #StunityLearning`,
    topicTags: ['History', 'Travel', 'Architecture'],
    mediaUrls: [
      'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1431274172761-fca41d93e114?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1490380169520-0a4b88d5103a?q=80&w=1000&auto=format&fit=crop'
    ]
  },
  {
    title: 'នាឡិកា Big Ben និងវិមាន Westminster (London Legacy)',
    content: `និមិត្តរូបនៃភាពត្រឹមត្រូវ និងពេលវេលា៖ នាឡិកា Big Ben នៅចក្រភពអង់គ្លេស។ 🇬🇧🕰️

Big Ben មិនមែនជាឈ្មោះរបស់ប៉មទាំងមូលនោះទេ ប៉ុន្តែវាគឺជាឈ្មោះរបស់ "ជួងដ៏ធំ" ដែលស្ថិតនៅខាងក្នុងប៉មនាឡិកា (Elizabeth Tower)។ វាត្រូវបានសាងសង់ឡើងក្នុងឆ្នាំ ១៨៥៩ និងបានក្លាយជាចំណុចទាក់ទាញបំផុតនៅទីក្រុងឡុងដ៍។

ហេតុការណ៍អស្ចារ្យ៖
✅ នាឡិកានេះដើរដោយភាពជាក់លាក់បំផុត ទោះបីជាឆ្លងកាត់សង្គ្រាមលោកលើកទី២ ក៏ដោយ។
✅ មុខនាឡិកានីមួយៗមានអង្កត់ផ្ចិតដល់ទៅ ៧ ម៉ែត្រ។
✅ សំឡេងជួងរបស់វាត្រូវបានគេឮនៅទូទាំងទីក្រុងឡុងដ៍។

#London #BigBen #History #UnitedKingdom #KnowledgeIsPower #Architecture`,
    topicTags: ['History', 'London', 'Culture'],
    mediaUrls: [
      'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop'
    ]
  },
  {
    title: 'ការធ្វើដំណើរទៅកាន់អតីតកាល៖ អរិយធម៌ដ៏អស្ចារ្យ (Ancient Civilizations)',
    content: `តើមនុស្សជាតិបានឆ្លងកាត់អ្វីខ្លះ ទម្រាំមកដល់សម័យកាលបច្ចេកវិទ្យានេះ? 🏛️កម្រងចំណេះដឹងប្រវត្តិសាស្ត្រពិភពលោក។

ការសិក្សាពីប្រវត្តិសាស្ត្រមិនមែនគ្រាន់តែជាការចងចាំថ្ងៃខែឆ្នាំនោះទេ ប៉ុន្តែវាគឺជាការរៀនសូត្រពីកំហុស និងភាពជោគជ័យរបស់អ្នកមុន។ ចាប់ពីអាណាចក្ររ៉ូម រហូតដល់ចក្រភពអង្គរដ៏រុងរឿងរបស់យើង គ្រប់ទីកន្លែងសុទ្ធតែមានមេរៀនដ៏មានតម្លៃ។

តើប្រវត្តិសាស្ត្រនៃប្រទេសណាដែលអ្នកចូលចិត្តសិក្សាជាងគេ? 🌍✨

#WorldHistory #Civilization #Archaeology #Education #GlobalKnowledge #Stunity`,
    topicTags: ['History', 'Education', 'Culture'],
    mediaUrls: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1547038577-da80abbc4f19?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1531572753322-ad063cecc140?q=80&w=1000&auto=format&fit=crop'
    ]
  }
];

async function createKnowledgeCarouselPosts() {
  console.log('🔍 Finding admin user...');
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
  });

  if (!admin) {
    console.error('❌ No admin user found!');
    return;
  }

  console.log('🚀 Creating Carousel Knowledge Posts...');

  for (const post of postsData) {
    const createdPost = await prisma.post.create({
      data: {
        authorId: admin.id,
        title: post.title,
        content: post.content,
        postType: 'ARTICLE',
        visibility: 'PUBLIC',
        topicTags: post.topicTags,
        mediaUrls: post.mediaUrls,
        mediaMetadata: { 
          images: post.mediaUrls.map(() => ({ width: 1000, height: 1500 })) 
        },
        mediaAspectRatio: 0.67,
        mediaDisplayMode: 'AUTO',
        difficultyLevel: 2.0,
      },
    });
    console.log(`✅ Created Post: ${post.title} (ID: ${createdPost.id}) with ${post.mediaUrls.length} images.`);
  }

  console.log('\n✨ All knowledge carousel posts created successfully!');
}

createKnowledgeCarouselPosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
