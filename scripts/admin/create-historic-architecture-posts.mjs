import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const postsData = [
  {
    title: 'អាថ៌កំបាំងនៃប៉មផ្អៀងទីក្រុងភីសា (Leaning Tower of Pisa)',
    content: `តើអ្នកដឹងទេថា ប៉មផ្អៀងទីក្រុងភីសា ចំណាយពេលសាងសង់ជិត ២០០ឆ្នាំ? 🇮🇹🗼

ប៉មនេះស្ថិតនៅក្នុងប្រទេសអ៊ីតាលី ហើយវាបានចាប់ផ្តើមផ្អៀងតាំងពីពេលដែលគេកំពុងសាងសង់ជាន់ទី៣ មកម្ល៉េះ ដោយសារតែគ្រឹះសំណង់ស្ថិតនៅលើដីទន់។ ទោះបីជាវាមានសណ្ឋានផ្អៀងបែបនេះក្តី ប៉ុន្តែវាបានក្លាយជាស្ថាបត្យកម្មដ៏ទាក់ទាញបំផុតមួយនៅលើពិភពលោក ដែលបង្ហាញពីភាពរឹងមាំ និងតុល្យភាពនៃវិស្វកម្ម។

រហូតមកដល់បច្ចុប្បន្ន អ្នកវិទ្យាសាស្ត្របានព្យាយាមរក្សាស្ថេរភាពរបស់វា ដើម្បីកុំឱ្យវាដួលរលំ និងរក្សាទុកជាមរតកសម្រាប់មនុស្សជំនាន់ក្រោយ។

#LeaningTowerOfPisa #Italy #Architecture #History #Travel #StunityLearning`,
    topicTags: ['Architecture', 'History', 'Italy'],
    mediaUrls: ['https://images.unsplash.com/photo-1543393309-11909a9c1766?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'មហាសាលពីរ៉ាមីតហ្គីហ្សា៖ អច្ឆរិយៈវត្ថុបុរាណដែលនៅសេសសល់តែមួយគត់',
    content: `សំណង់ពីរ៉ាមីត (The Great Pyramid of Giza) គឺជាអច្ឆរិយៈវត្ថុបុរាណមួយក្នុងចំណោមទាំង៧ ដែលនៅសេសសល់រហូតមកដល់បច្ចុប្បន្ន។ 🇪🇬🧱

វាត្រូវបានសាងសង់ឡើងជាផ្នូរសម្រាប់ស្ដេចផារ៉ោន (Pharaoh Khufu) កាលពីជាង ៤,៥០០ឆ្នាំមុន។ ស្ថាបត្យកម្មនេះប្រើប្រាស់ថ្មយក្សរាប់លានដុំ ដែលមានទម្ងន់ធ្ងន់ៗបំផុត ហើយត្រូវបានរៀបចំឡើងដោយភាពច្បាស់លាស់បំផុតតាមក្បួនតារាសាស្ត្រ និងគណិតវិទ្យា។

រហូតមកដល់ពេលនេះ របៀបដែលមនុស្សបុរាណអាចលើកថ្មយក្សទាំងនោះមកតម្រៀបគ្នាបានយ៉ាងស្អាតបែបនេះ នៅតែជាអាថ៌កំបាំងដ៏គួរឱ្យចាប់អារម្មណ៍បំផុតសម្រាប់អ្នកបុរាណវិទ្យា។

#AncientEgypt #Pyramids #History #Archaeology #WondersOfTheWorld #Education`,
    topicTags: ['History', 'Egypt', 'Archaeology'],
    mediaUrls: ['https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'ប៉មអេហ្វែល៖ និមិត្តរូបនៃស្ថាបត្យកម្មដែកថែបនៅទីក្រុងប៉ារីស',
    content: `ប៉មអេហ្វែល (Eiffel Tower) មិនត្រឹមតែជាកន្លែងទេសចរណ៍ដ៏ល្បីល្បាញប៉ុណ្ណោះទេ ប៉ុន្តែវាគឺជាតំណាងនៃបដិវត្តន៍ឧស្សាហកម្ម និងសិល្បៈស្ថាបត្យកម្ម។ 🇫🇷🗼

សាងសង់ឡើងក្នុងឆ្នាំ ១៨៨៩ ដើម្បីអបអរសាទរខួប ១០០ឆ្នាំនៃបដិវត្តន៍បារាំង សំណង់ដែកថែបនេះមានកម្ពស់ ៣៣០ ម៉ែត្រ។ ដំបូងឡើយ វាត្រូវបានគេរិះគន់យ៉ាងខ្លាំង ប៉ុន្តែបច្ចុប្បន្នវាបានក្លាយជាមរតកវប្បធម៌ និងជានិមិត្តរូបនៃសេចក្តីស្រឡាញ់ និងការច្នៃប្រឌិត។

ការលាបថ្នាំប៉មនេះឡើងវិញ រៀងរាល់ ៧ឆ្នាំម្តង គឺជាកិច្ចការដ៏ធំដែលត្រូវប្រើប្រាស់ថ្នាំពណ៌ដល់ទៅ ៦០ តោន ដើម្បីការពារដែកពីការច្រែះ។

#EiffelTower #Paris #France #Architecture #History #GlobalKnowledge`,
    topicTags: ['Architecture', 'History', 'France'],
    mediaUrls: ['https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'សង្វៀនកូឡូសេ៖ មរតកវិស្វកម្មដ៏អស្ចារ្យនៃអាណាចក្ររ៉ូម',
    content: `សង្វៀនកូឡូសេ (The Colosseum) នៅទីក្រុងរ៉ូម គឺជាសង្វៀនបុរាណដ៏ធំបំផុតដែលមិនធ្លាប់មានពីមុនមក។ 🇮🇹🏛️

សាងសង់ឡើងក្នុងសតវត្សទី១ បូជនីយដ្ឋាននេះអាចផ្ទុកមនុស្សបានដល់ទៅ ៥០,០០០ ទៅ ៨០,០០០ នាក់។ វាត្រូវបានប្រើប្រាស់សម្រាប់ការប្រកួតកីឡា និងការសម្តែងផ្សេងៗក្នុងសម័យអាណាចក្ររ៉ូម។ ស្ថាបត្យកម្មរាងជារង្វង់នេះ បង្ហាញពីការយល់ដឹងស៊ីជម្រៅរបស់ជនជាតិរ៉ូមបុរាណអំពីវិស្វកម្មសំណង់ និងការរៀបចំលំហសាធារណៈ។

ទោះបីជាត្រូវបានបំផ្លាញដោយផ្នែកខ្លះដោយការរញ្ជួយដី និងការលួចថ្មក៏ដោយ ប៉ុន្តែវានៅតែឈរយ៉ាងរឹងមាំជានិមិត្តរូបនៃអំណាច និងប្រវត្តិសាស្ត្ររ៉ូម។

#TheColosseum #Rome #Italy #History #RomanEmpire #Architecture`,
    topicTags: ['History', 'Italy', 'Architecture'],
    mediaUrls: ['https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  }
];

async function createHistoricArchitecturePosts() {
  const targetEmail = 'naing.seiha.hs@moeys.gov.kh';
  console.log(`🔍 Finding user with email: ${targetEmail}...`);
  
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    console.error(`❌ User with email ${targetEmail} not found!`);
    return;
  }

  console.log(`🚀 Creating ${postsData.length} Historic Architecture Posts...`);

  for (const post of postsData) {
    const createdPost = await prisma.post.create({
      data: {
        authorId: user.id,
        title: post.title,
        content: post.content,
        postType: 'ARTICLE',
        visibility: 'PUBLIC',
        topicTags: post.topicTags,
        mediaUrls: post.mediaUrls,
        mediaMetadata: { 
          width: 1000, 
          height: 1500 
        },
        mediaAspectRatio: post.mediaAspectRatio,
        mediaDisplayMode: 'AUTO',
        difficultyLevel: 2.0,
      },
    });
    console.log(`✅ Created Post: ${post.title} (ID: ${createdPost.id})`);
  }

  console.log('\n✨ All historic architecture posts created successfully!');
}

createHistoricArchitecturePosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
