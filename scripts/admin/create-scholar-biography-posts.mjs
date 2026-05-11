import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const postsData = [
  {
    title: 'អាឡាន់ ធូរីង (Alan Turing)៖ បិតានៃវិទ្យាសាស្ត្រកុំព្យូទ័រ និងបញ្ញាសិប្បនិម្មិត',
    content: `អាឡាន់ ធូរីង គឺជាគណិតវិទូ និងជាអ្នកវិទ្យាសាស្ត្រកុំព្យូទ័រជនជាតិអង់គ្លេស ដែលត្រូវបានគេទទួលស្គាល់ថាជាបិតាស្ថាបនិកនៃវិទ្យាសាស្ត្រកុំព្យូទ័រទំនើប។ ក្នុងអំឡុងសង្គ្រាមលោកលើកទី២ លោកបានដើរតួនាទីយ៉ាងសំខាន់ក្នុងការបកស្រាយកូដសម្ងាត់ "Enigma" របស់កងទ័ពអាល្លឺម៉ង់ ដែលជួយសង្គ្រោះជីវិតមនុស្សរាប់លាននាក់ និងបញ្ចៀសសង្គ្រាមឱ្យឆាប់បញ្ចប់។

ក្រៅពីសមិទ្ធផលក្នុងសង្គ្រាម លោកបានបង្កើត "Turing Machine" ដែលជាមូលដ្ឋានគ្រឹះនៃក្បួនដោះស្រាយ (Algorithm) និងការគណនាតាមប្រព័ន្ធកុំព្យូទ័រនាពេលបច្ចុប្បន្ន។ លោកក៏បានលើកឡើងនូវទ្រឹស្តី "Turing Test" ដែលជាគោលការណ៍សំខាន់ក្នុងការវាស់ស្ទង់សម្ថភាពបញ្ញាសិប្បនិម្មិត (AI)។ មរតកចំណេះដឹងរបស់លោកបានផ្លាស់ប្តូរពិភពលោកបច្ចេកវិទ្យាជារៀងរហូត។

#AlanTuring #ComputerScience #ArtificialIntelligence #History #Genius #StunityBiography`,
    topicTags: ['Biography', 'Technology', 'History'],
    mediaUrls: ['https://images.unsplash.com/photo-1516110833967-0b5716ca1387?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'នីកូឡា ថេស្លា (Nikola Tesla)៖ វិស្វករអគ្គិសនីដ៏អស្ចារ្យដែលផ្លាស់ប្តូរពិភពលោក',
    content: `នីកូឡា ថេស្លា គឺជាវិស្វករអគ្គិសនី និងជាអ្នកបង្កើតថ្មីជនជាតិស៊ែប៊ី-អាមេរិក ដែលល្បីល្បាញតាមរយៈការរួមចំណែកដល់ការរចនាប្រព័ន្ធអគ្គិសនីចរន្តឆ្លាស់ (Alternating Current - AC) ដែលយើងកំពុងប្រើប្រាស់នៅទូទាំងពិភពលោកសព្វថ្ងៃ។ លោកគឺជាអ្នកប្រាជ្ញដែលមានចក្ខុវិស័យវែងឆ្ងាយ និងបានប៉ាន់ស្មានទុកជាមុននូវបច្ចេកវិទ្យាទំនើបៗជាច្រើន រួមទាំងការបញ្ជូនទិន្នន័យឥតខ្សែ និងទូរស័ព្ទចល័ត។

ថេស្លា បានចុះបញ្ជីប៉ាតង់ជាង ៣០០ សម្រាប់របកគំហើញរបស់លោក រួមមានម៉ូទ័រអគ្គិសនី វិទ្យុ និងបច្ចេកវិទ្យាកាំរស្មីអ៊ិច (X-ray)។ ទោះបីជាលោកជួបប្រទះការលំបាកជាច្រើនក្នុងជីវិត និងការប្រកួតប្រជែងផ្នែកអាជីវកម្មក្តី ប៉ុន្តែស្មារតីច្នៃប្រឌិត និងការលះបង់របស់លោកចំពោះវិទ្យាសាស្ត្រ បានធ្វើឱ្យលោកក្លាយជាបុគ្គលដ៏សំខាន់បំផុតក្នុងប្រវត្តិសាស្ត្រវិស្វកម្ម។

#NikolaTesla #Electricity #Innovation #Physics #Engineer #Stunity`,
    topicTags: ['Biography', 'Science', 'Engineering'],
    mediaUrls: ['https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'ម៉ារី គុយរី (Marie Curie)៖ ស្ត្រីអ្នកវិទ្យាសាស្ត្រដំបូងគេដែលទទួលបានរង្វាន់ណូបែលពីរ',
    content: `ម៉ារី គុយរី គឺជាអ្នករូបវិទ្យា និងជាអ្នកគីមីវិទ្យាជនជាតិប៉ូឡូញ-បារាំង ដែលល្បីល្បាញតាមរយៈការសិក្សាស្រាវជ្រាវអំពីបាតុភូតវិទ្យុសកម្ម (Radioactivity)។ លោកស្រីគឺជាស្ត្រីដំបូងបង្អស់ដែលទទួលបានរង្វាន់ណូបែល និងជាបុគ្គលតែម្នាក់គត់ក្នុងប្រវត្តិសាស្ត្រដែលទទួលបានរង្វាន់ណូបែលក្នុងវិស័យវិទ្យាសាស្ត្រផ្សេងគ្នាពីរ គឺរូបវិទ្យា និងគីមីវិទ្យា។

របកគំហើញរបស់លោកស្រីនូវធាតុគីមីថ្មីចំនួនពីរគឺ រ៉ាដ្យូម (Radium) និងប៉ូឡូញ៉ូម (Polonium) បាននាំមកនូវការវិវត្តយ៉ាងខ្លាំងក្នុងវិស័យវេជ្ជសាស្ត្រ ជាពិសេសក្នុងការព្យាបាលជំងឺមហារីក និងការបង្កើតម៉ាស៊ីនកាំរស្មីអ៊ិចចល័ត។ ភាពអត់ធ្មត់ និងការលះបង់របស់លោកស្រីចំពោះវិទ្យាសាស្ត្រ បានក្លាយជាគំរូ និងជាការលើកទឹកចិត្តដល់ស្ត្រីនៅទូទាំងពិភពលោក។

#MarieCurie #Science #NobelPrize #Radioactivity #WomenInScience #Education`,
    topicTags: ['Biography', 'Science', 'Chemistry'],
    mediaUrls: ['https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'អ៊ីសាក់ ញូតុន (Isaac Newton)៖ អ្នកប្រាជ្ញរូបវិទ្យាដែលរកឃើញច្បាប់ទំនាញសកល',
    content: `ស៊ើរ អ៊ីសាក់ ញូតុន គឺជាអ្នករូបវិទ្យា គណិតវិទូ និងជាតារាវិទូជនជាតិអង់គ្លេស ដែលត្រូវបានគេចាត់ទុកថាជាបុគ្គលម្នាក់ដែលមានឥទ្ធិពលបំផុតក្នុងប្រវត្តិសាស្ត្រវិទ្យាសាស្ត្រ។ ស្នាដៃដ៏សំខាន់របស់លោក "Philosophiæ Naturalis Principia Mathematica" បានបង្កើតមូលដ្ឋានគ្រឹះនៃយន្តវិទ្យាបុរាណ (Classical Mechanics) ដែលរៀបរាប់ពីច្បាប់ចលនា និងច្បាប់ទំនាញសកល។

ក្រៅពីការសិក្សាអំពីកម្លាំងទំនាញ លោកក៏បានធ្វើការស្រាវជ្រាវយ៉ាងស៊ីជម្រៅលើផ្នែកអុបទិក (Optics) និងបានបង្កើតកញ្ចក់ឆ្លុះបញ្ចាំងនៃតេឡេស្កុបដំបូងគេ។ លោកក៏ជាអ្នករួមចំណែកបង្កើតមុខវិជ្ជាគណិតវិទ្យា "Calculus" ផងដែរ។ របកគំហើញរបស់ញូតុនបានជួយឱ្យមនុស្សជាតិយល់ដឹងកាន់តែច្បាស់អំពីដំណើរការនៃភព និងចក្រវាលទាំងមូល។

#IsaacNewton #Physics #Gravity #Mathematics #ScienceHistory #Stunity`,
    topicTags: ['Biography', 'Science', 'Physics'],
    mediaUrls: ['https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  }
];

async function createScholarBiographyPosts() {
  const targetEmail = 'naing.seiha.hs@moeys.gov.kh';
  console.log(`🔍 Finding user with email: ${targetEmail}...`);
  
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    console.error(`❌ User with email ${targetEmail} not found!`);
    return;
  }

  console.log(`🚀 Creating ${postsData.length} Scholar Biography Posts...`);

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

  console.log('\n✨ All scholar biography posts created successfully!');
}

createScholarBiographyPosts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
