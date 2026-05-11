import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const pollsData = [
  {
    title: 'Poll: អក្សរសាស្ត្រខ្មែរ - រឿងកុលាបប៉ៃលិន',
    content: 'តើប្រធានបទសំខាន់នៃរឿងកុលាបប៉ៃលិននិយាយពីអ្វី?',
    topicTags: ['អក្សរសាស្ត្រខ្មែរ', 'បាក់ឌុប២០២៦', 'bac2'],
    options: ['សេចក្តីស្នេហាស្មោះត្រង់ និងការតស៊ូ', 'ការក្បត់ជាតិ', 'ទំនាស់វណ្ណៈ', 'ការផ្សងព្រេង']
  },
  {
    title: 'Poll: ប្រវត្តិវិទ្យា - ឯករាជ្យជាតិ',
    content: 'តើប្រទេសកម្ពុជាទទួលបានឯករាជ្យពេញលេញពីអាណានិគមបារាំងនៅថ្ងៃ ខែ ឆ្នាំណា?',
    topicTags: ['ប្រវត្តិវិទ្យា', 'បាក់ឌុប២០២៦', 'bac2'],
    options: ['៩ វិច្ឆិកា ១៩៥៣', '៩ តុលា ១៩៧០', '១៧ មេសា ១៩៧៥', '៧ មករា ១៩៧៩']
  },
  {
    title: 'Poll: រូបវិទ្យា - ខ្នាតរង្វាស់',
    content: 'តើកម្លាំង (Force) មានខ្នាតគិតជាអ្វី តាមប្រព័ន្ធខ្នាតអន្តរជាតិ (SI)?',
    topicTags: ['រូបវិទ្យា', 'បាក់ឌុប២០២៦', 'bac2'],
    options: ['ញូតុន (Newton)', 'ស៊ូល (Joule)', 'វ៉ាត់ (Watt)', 'ប៉ាស្កាល់ (Pascal)']
  },
  {
    title: 'Poll: គីមីវិទ្យា - តារាងខួបគីមី',
    content: 'តើធាតុអុកស៊ីសែន (Oxygen) មានលេខអាតូមប៉ុន្មាន?',
    topicTags: ['គីមីវិទ្យា', 'បាក់ឌុប២០២៦', 'bac2'],
    options: ['8', '6', '16', '12']
  },
  {
    title: 'Poll: គណិតវិទ្យា - ដេរីវេ',
    content: 'តើដេរីវេនៃអនុគមន៍ f(x) = sin(x) ស្មើនឹងប៉ុន្មាន?',
    topicTags: ['គណិតវិទ្យា', 'បាក់ឌុប២០២៦', 'bac2'],
    options: ['cos(x)', '-cos(x)', 'tan(x)', '-sin(x)']
  },
  {
    title: 'Poll: ជីវវិទ្យា - ក្រូម៉ូសូម',
    content: 'តើកោសិកាលូតលាស់របស់មនុស្ស (Somatic cell) មានក្រូម៉ូសូមចំនួនប៉ុន្មាន?',
    topicTags: ['ជីវវិទ្យា', 'បាក់ឌុប២០២៦', 'bac2'],
    options: ['46 ក្រូម៉ូសូម (23 គូ)', '23 ក្រូម៉ូសូម', '48 ក្រូម៉ូសូម', '44 ក្រូម៉ូសូម']
  }
];

async function seedPolls() {
  console.log('Finding admin user...');
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
  });

  if (!admin) {
    console.error('No admin user found!');
    return;
  }

  console.log('Creating Polls...');

  for (const poll of pollsData) {
    const post = await prisma.post.create({
      data: {
        authorId: admin.id,
        title: poll.title,
        content: poll.content,
        postType: 'POLL',
        visibility: 'PUBLIC',
        topicTags: poll.topicTags,
        pollOptions: {
          create: poll.options.map((opt, index) => ({
            text: opt,
            position: index,
          })),
        },
      },
    });
    console.log(`Created Poll: ${poll.title} (ID: ${post.id})`);
  }

  console.log('Successfully created more Bac2 polls!');
}

seedPolls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
