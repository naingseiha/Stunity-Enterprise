import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const postsData = [
  {
    title: 'Charles Darwin និងទ្រឹស្តីនៃការវិវត្តតាមរយៈការជ្រើសរើសដោយធម្មជាតិ',
    content: `Charles Darwin (១៨០៩-១៨៨២) គឺជាអ្នកធម្មជាតិវិទូជនជាតិអង់គ្លេស ដែលបានផ្លាស់ប្តូរការយល់ដឹងរបស់ពិភពលោកអំពីជីវវិទ្យាតាមរយៈទ្រឹស្តីនៃការវិវត្ត (Evolution)។ នៅក្នុងស្នាដៃដ៏ល្បីល្បាញបំផុតរបស់លោក "On the Origin of Species" ដែលបានបោះពុម្ពផ្សាយក្នុងឆ្នាំ ១៨៥៩ លោកបានបង្ហាញថា ភាវរស់ទាំងអស់មានការវិវត្តពីបុព្វបុរសរួមគ្នាតាមរយៈដំណើរការមួយដែលលោកហៅថា "ការជ្រើសរើសដោយធម្មជាតិ" (Natural Selection)។

ទ្រឹស្តីនេះពន្យល់ថា ភាវរស់ណាដែលមានលក្ខណៈសម្បត្តិសមស្របនឹងបរិស្ថានជាងគេ នឹងមានឱកាសរស់រាន និងបន្តពូជបានច្រើនជាង។ ការរួមចំណែករបស់លោកបានក្លាយជាមូលដ្ឋានគ្រឹះនៃជីវវិទ្យាទំនើប និងជួយឱ្យយើងយល់ដឹងពីភាពចម្រុះនៃជីវិតនៅលើភពផែនដី។

ប្រភពយោង៖ 
- Darwin, C. (1859). On the Origin of Species by Means of Natural Selection.
- Britannica, The Editors of Encyclopaedia. "Charles Darwin". Encyclopedia Britannica.

#CharlesDarwin #Evolution #Biology #ScienceHistory #StunityEducation`,
    topicTags: ['Biography', 'Biology', 'Science'],
    mediaUrls: ['https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'Leonardo da Vinci៖ កំពូលមនុស្សពហុជំនាញនៃយុគសម័យក្រុមហ៊ុន (Renaissance)',
    content: `Leonardo da Vinci (១៤៥២-១៥១៩) ត្រូវបានគេទទួលស្គាល់ថាជាបុគ្គលដែលមានទេពកោសល្យបំផុតម្នាក់ក្នុងប្រវត្តិសាស្ត្រមនុស្សជាតិ។ លោកមិនត្រឹមតែជាវិចិត្រករដ៏ឆ្នើមដែលបានបង្កើតផ្ទាំងគំនូរអមតៈដូចជា "Mona Lisa" និង "The Last Supper" ប៉ុណ្ណោះទេ ប៉ុន្តែលោកក៏ជាអ្នកវិទ្យាសាស្ត្រ វិស្វករ អ្នកកាយវិភាគសាស្ត្រ និងជាអ្នកបង្កើតថ្មីផងដែរ។

កំណត់ត្រារបស់លោក (Notebooks) បង្ហាញពីការសិក្សាយ៉ាងស៊ីជម្រៅលើផ្នែកមេកានិក ការហោះហើរ និងកាយវិភាគសាស្ត្រមនុស្ស ដែលលើសពីចំណេះដឹងក្នុងសម័យកាលនោះរាប់រយឆ្នាំ។ Da Vinci គឺជាតំណាងនៃស្មារតីចង់ដឹងចង់ឃើញ និងការរួមបញ្ចូលគ្នារវាងសិល្បៈ និងវិទ្យាសាស្ត្រយ៉ាងល្អឥតខ្ចោះ។

ប្រភពយោង៖
- Louvre Museum Collections (Paris).
- National Gallery of Art. "Leonardo da Vinci: Life and Work".

#LeonardodaVinci #Renaissance #ArtAndScience #History #Genius #Stunity`,
    topicTags: ['Biography', 'Art', 'History'],
    mediaUrls: ['https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'Louis Pasteur៖ អ្នកវិទ្យាសាស្ត្រដែលបានរកឃើញវ៉ាក់សាំងការពារជំងឺឆ្កែឆ្កួត និងបច្ចេកវិទ្យាប៉ាស្ទ័រនីយកម្ម',
    content: `Louis Pasteur (១៨២២-១៨៩៥) គឺជាអ្នកជីវវិទូ និងជាអ្នកគីមីវិទ្យាជនជាតិបារាំង ដែលបានបង្កើតរបកគំហើញដ៏សំខាន់បំផុតសម្រាប់សុខភាពសាធារណៈ។ លោកគឺជាអ្នករកឃើញថា មីក្រូសារពាង្គកាយ (Microorganisms) គឺជាមូលហេតុនៃជំងឺជាច្រើន និងការធ្វើឱ្យអាហារផ្អូម ឬខូចគុណភាព។

សមិទ្ធផលដ៏ល្បីល្បាញរបស់លោកគឺការបង្កើតបច្ចេកវិទ្យា "Pasteurization" ដែលជួយសម្លាប់បាក់តេរីក្នុងទឹកដោះគោ និងភេសជ្ជៈ ដើម្បីការពារការចម្លងជំងឺ។ លើសពីនេះ លោកបានបង្កើតវ៉ាក់សាំងដំបូងគេសម្រាប់ការពារជំងឺអង់ត្រាក់ (Anthrax) និងជំងឺឆ្កែឆ្កួត (Rabies) ដែលបានជួយសង្គ្រោះជីវិតមនុស្សរាប់មិនអស់នៅទូទាំងពិភពលោក។

ប្រភពយោង៖
- Institut Pasteur. "History of Louis Pasteur".
- Nobel Prize Outreach. "The Discovery of Germ Theory".

#LouisPasteur #Vaccine #Microbiology #Medicine #Science #Stunity`,
    topicTags: ['Biography', 'Science', 'Medicine'],
    mediaUrls: ['https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  },
  {
    title: 'Pythagoras៖ គណិតវិទូ និងទស្សនវិទូដែលបានរកឃើញទ្រឹស្តីបទត្រីកោណកែង',
    content: `Pythagoras (ប្រហែល ៥៧០-៤៩៥ មុនគ្រិស្តសករាជ) គឺជាអ្នកប្រាជ្ញជនជាតិក្រិចដ៏ល្បីល្បាញ ដែលមានឥទ្ធិពលយ៉ាងខ្លាំងលើវិស័យគណិតវិទ្យា និងទស្សនវិជ្ជា។ លោកត្រូវបានគេស្គាល់ជាសកលតាមរយៈ "ទ្រឹស្តីបទពីតាករ" (Pythagorean Theorem) ដែលចែងថា នៅក្នុងត្រីកោណកែង ការ៉េនៃជ្រុងអ៊ីប៉ូតេនុស គឺស្មើនឹងផលបូកការ៉េនៃជ្រុងពីរទៀត។

ក្រៅពីគណិតវិទ្យា លោកបានបង្កើតសាលា "Pythagoreanism" ដែលសិក្សាពីទំនាក់ទំនងរវាងលេខ ជីវិត និងចក្រវាល។ លោកជឿថា "អ្វីៗទាំងអស់គឺជាលេខ" ហើយគោលការណ៍របស់លោកបានក្លាយជាគ្រឹះសម្រាប់ការអភិវឌ្ឍន៍វិស័យធរណីមាត្រ និងទ្រឹស្តីតន្ត្រីរហូតមកដល់បច្ចុប្បន្ន។

ប្រភពយោង៖
- Stanford Encyclopedia of Philosophy. "Pythagoras".
- O'Connor, J. J., & Robertson, E. F. "Pythagoras of Samos". MacTutor History of Mathematics.

#Pythagoras #Mathematics #Philosophy #History #AncientGreek #Education`,
    topicTags: ['Biography', 'Mathematics', 'Philosophy'],
    mediaUrls: ['https://images.unsplash.com/photo-1509228468518-180dd482195e?q=80&w=1000&auto=format&fit=crop'],
    mediaAspectRatio: 0.67
  }
];

async function createOfficialScholarBiographies() {
  const targetEmail = 'naing.seiha.hs@moeys.gov.kh';
  console.log(`🔍 Finding user with email: ${targetEmail}...`);
  
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    console.error(`❌ User with email ${targetEmail} not found!`);
    return;
  }

  console.log(`🚀 Creating ${postsData.length} Official Scholar Biography Posts...`);

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
        difficultyLevel: 2.5,
      },
    });
    console.log(`✅ Created Post: ${post.title} (ID: ${createdPost.id})`);
  }

  console.log('\n✨ All official scholar biography posts created successfully!');
}

createOfficialScholarBiographies()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
