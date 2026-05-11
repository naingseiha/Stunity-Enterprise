import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const postsData = [
  {
    title: 'Alan Turing៖ បិតានៃវិទ្យាសាស្ត្រកុំព្យូទ័រ និងអ្នកបកស្រាយកូដសម្ងាត់ Enigma',
    content: `Alan Turing (១៩១២-១៩៥៤) គឺជាគណិតវិទូ និងជាអ្នកវិទ្យាសាស្ត្រកុំព្យូទ័រជនជាតិអង់គ្លេស ដែលត្រូវបានគេចាត់ទុកថាជាបិតាស្ថាបនិកនៃវិទ្យាសាស្ត្រកុំព្យូទ័រ និងបញ្ញាសិប្បនិម្មិត (AI)។ ក្នុងអំឡុងសង្គ្រាមលោកលើកទី២ លោកបានដឹកនាំក្រុមការងារនៅ Bletchley Park ដើម្បីបកស្រាយកូដសម្ងាត់ "Enigma" របស់កងទ័ពអាល្លឺម៉ង់ ដែលជាកត្តាសំខាន់បំផុតក្នុងការជួយឱ្យសង្គ្រាមលោកលើកទី២ បញ្ចប់បានឆាប់រហ័ស។

លោកបានបង្កើត "Turing Machine" ដែលជាគំរូទ្រឹស្តីនៃកុំព្យូទ័រទំនើប និងបានបង្កើត "Turing Test" ដើម្បីវាស់ស្ទង់សម្ថភាពបញ្ញារបស់ម៉ាស៊ីន។

ប្រភពយោង៖
- Hodges, A. (1983). Alan Turing: The Enigma.
- Stanford Encyclopedia of Philosophy. "Alan Turing".

#AlanTuring #ComputerScience #AI #History #StunityBiography`,
    mediaUrls: ['https://upload.wikimedia.org/wikipedia/commons/1/17/Alan_Turing_passport_photo.jpg'],
    topicTags: ['Biography', 'Technology', 'History']
  },
  {
    title: 'Albert Einstein៖ កំពូលអ្នកប្រាជ្ញរូបវិទ្យាម្ចាស់ទ្រឹស្តីរ៉េឡាទីវីតេ',
    content: `Albert Einstein (១៨៧៩-១៩៥៥) គឺជាអ្នករូបវិទ្យាទ្រឹស្តីដែលមានឥទ្ធិពលបំផុតគ្រប់សម័យកាល។ លោកល្បីល្បាញបំផុតតាមរយៈការបង្កើតទ្រឹស្តីរ៉េឡាទីវីតេ (Relativity) និងសមីការដ៏ល្បីល្បាញ E=mc² ដែលបានផ្លាស់ប្តូរការយល់ឃើញរបស់យើងចំពោះពេលវេលា លំហ និងថាមពល។

លោកបានទទួលរង្វាន់ណូបែលផ្នែករូបវិទ្យានៅឆ្នាំ ១៩២១ សម្រាប់ការបកស្រាយអំពីបាតុភូត Photoelectric Effect។ Einstein មិនត្រឹមតែជាអ្នកវិទ្យាសាស្ត្រប៉ុណ្ណោះទេ ប៉ុន្តែលោកក៏ជាអ្នកតស៊ូមតិដើម្បីសន្តិភាពពិភពលោកផងដែរ។

ប្រភពយោង៖
- NobelPrize.org. "Albert Einstein – Biographical".
- Isaacson, W. (2007). Einstein: His Life and Universe.

#AlbertEinstein #Physics #Relativity #Science #NobelPrize`,
    mediaUrls: ['https://upload.wikimedia.org/wikipedia/commons/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg'],
    topicTags: ['Biography', 'Science', 'Physics']
  },
  {
    title: 'Marie Curie៖ ស្ត្រីអ្នកវិទ្យាសាស្ត្រដំបូងគេដែលទទួលបានរង្វាន់ណូបែលពីរ',
    content: `Marie Curie (១៨៦៧-១៩៣៤) គឺជាអ្នករូបវិទ្យា និងអ្នកគីមីវិទ្យាជនជាតិប៉ូឡូញ-បារាំង ដែលល្បីល្បាញតាមរយៈការស្រាវជ្រាវអំពីបាតុភូតវិទ្យុសកម្ម (Radioactivity)។ លោកស្រីគឺជាស្ត្រីដំបូងគេដែលទទួលបានរង្វាន់ណូបែល និងជាបុគ្គលតែម្នាក់គត់ដែលទទួលបានរង្វាន់ណូបែលក្នុងវិស័យវិទ្យាសាស្ត្រផ្សេងគ្នាពីរ គឺរូបវិទ្យា (១៩០៣) និងគីមីវិទ្យា (១៩១១)។

លោកស្រីបានរកឃើញធាតុគីមី Polonium និង Radium ហើយការលះបង់របស់លោកស្រីបានជួយឱ្យវិស័យវេជ្ជសាស្ត្រមានការរីកចម្រើនយ៉ាងខ្លាំង។

ប្រភពយោង៖
- Curie, M. (1911). Nobel Lecture in Chemistry.
- American Institute of Physics. "Marie Curie and the Science of Radioactivity".

#MarieCurie #Science #Chemistry #NobelPrize #Inspiration`,
    mediaUrls: ['https://upload.wikimedia.org/wikipedia/commons/c/c8/Marie_Curie_1903.jpg'],
    topicTags: ['Biography', 'Science', 'Chemistry']
  },
  {
    title: 'Nikola Tesla៖ វិស្វករអគ្គិសនីដ៏អស្ចារ្យដែលបានបង្កើតប្រព័ន្ធចរន្តឆ្លាស់ (AC)',
    content: `Nikola Tesla (១៨៥៦-១៩៤៣) គឺជាវិស្វករអគ្គិសនី និងជាអ្នកបង្កើតថ្មីដែលមានចក្ខុវិស័យវែងឆ្ងាយ។ លោកគឺជាអ្នករួមចំណែកដ៏សំខាន់ក្នុងការរចនាប្រព័ន្ធអគ្គិសនីចរន្តឆ្លាស់ (Alternating Current - AC) ដែលជាមូលដ្ឋានគ្រឹះនៃបណ្តាញអគ្គិសនីនៅទូទាំងពិភពលោកនាពេលបច្ចុប្បន្ន។

របកគំហើញរបស់លោកបានឈានទៅដល់ការបង្កើតម៉ូទ័រអគ្គិសនី វិទ្យុ និងបច្ចេកវិទ្យាឥតខ្សែផ្សេងៗទៀត។ Tesla ត្រូវបានគេស្គាល់ថាជាអ្នកប្រាជ្ញដែលលះបង់ដើម្បីការរីកចម្រើនរបស់មនុស្សជាតិ។

ប្រភពយោង៖
- Carlson, W. B. (2013). Tesla: Inventor of the Electrical Age.
- Smithsonian Institution. "Nikola Tesla's Extraordinary Life".

#NikolaTesla #Electricity #Engineering #Innovation #StunityBiography`,
    mediaUrls: ['https://upload.wikimedia.org/wikipedia/commons/d/d4/N.Tesla.JPG'],
    topicTags: ['Biography', 'Science', 'Engineering']
  }
];

async function createScholarPortraitsPosts() {
  const targetEmail = 'naing.seiha.hs@moeys.gov.kh';
  console.log(`🔍 Finding user with email: ${targetEmail}...`);
  
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    console.error(`❌ User with email ${targetEmail} not found!`);
    return;
  }

  console.log(`🚀 Creating ${postsData.length} Posts with Actual Scholar Portraits...`);

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
          width: 800, 
          height: 1000 
        },
        mediaAspectRatio: 0.8,
        mediaDisplayMode: 'AUTO',
        difficultyLevel: 2.5,
      },
    });
    console.log(`✅ Created Post with Real Portrait: ${post.title} (ID: ${createdPost.id})`);
  }

  console.log('\n✨ All scholar portrait posts created successfully!');
}

createScholarPortraitsPosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
