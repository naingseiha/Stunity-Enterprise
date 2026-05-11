import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const photo = (id, alt, width = 1200, height = 675) => ({
  url: `https://images.unsplash.com/${id}?w=${width}&h=${height}&fit=crop&q=85&auto=format`,
  type: 'image',
  width,
  height,
  aspectRatio: height / width,
  alt,
  source: 'Unsplash',
});

const replacements = [
  {
    title: 'Cheat Sheet: JavaScript async/await សម្រាប់អ្នកចាប់ផ្តើម',
    media: photo('photo-1515879218367-8466d910aaa4', 'Close-up of code on a laptop for programming study'),
  },
  {
    title: 'Python Data Analysis: ពី raw data ទៅ insight',
    media: photo('photo-1551288049-bebda4e38f71', 'Analytics dashboard on a computer screen'),
  },
  {
    title: 'AI Prompt Engineering: គិតដូចអ្នកបង្រៀន មុនសួរ AI',
    media: photo('photo-1677442136019-21780ecad995', 'Abstract artificial intelligence visualization'),
  },
  {
    title: 'System Design: បង្កើត Feed ដែលទ្រាំ heavy load',
    media: photo('photo-1451187580459-43490279c0fa', 'Digital network infrastructure for system design'),
  },
  {
    title: 'Database Indexing: ចំណុចតូចដែលធ្វើឱ្យ app លឿន',
    media: photo('photo-1544383835-bda2bc66a55d', 'Server and database infrastructure'),
  },
  {
    title: 'Cybersecurity Checklist មុន publish project',
    media: photo('photo-1563986768609-322da13575f3', 'Cybersecurity and secure login concept'),
  },
  {
    title: 'Business Model Canvas សម្រាប់សិស្សដែលចង់ចាប់ផ្តើម Startup',
    media: photo('photo-1552664730-d307ca884978', 'Business team planning a strategy workshop'),
  },
  {
    title: 'English Study: រៀន vocabulary ដោយប្រើ context',
    media: photo('photo-1522202176988-66273c2fd55f', 'Students studying and discussing together'),
  },
  {
    title: 'Linear Algebra: មូលដ្ឋានដែលនៅពីក្រោយ AI',
    media: photo('photo-1509228468518-180dd4864904', 'Mathematics formulas and equations on a board'),
  },
  {
    title: 'Physics: Ohm’s Law មិនមែនត្រឹមចាំสูตรទេ',
    media: photo('photo-1518770660439-4636190af475', 'Electronic circuit board for physics and engineering'),
  },
  {
    title: 'Biology: ពី DNA ទៅ Protein',
    media: photo('photo-1532187863486-abf9dbad1b69', 'Biology laboratory microscope and research equipment'),
  },
  {
    title: 'Chemistry Lab: សុវត្ថិភាពមុនពិសោធន៍',
    media: photo('photo-1532094349884-543bc11b234d', 'Chemistry glassware and lab experiment'),
  },
  {
    title: 'Architecture & Engineering: កម្លាំងក្លាយជារចនា',
    media: photo('photo-1503387762-592deb58ef4e', 'Architecture design and structural planning'),
  },
  {
    title: 'Robotics & IoT: Sensor មិនមែនគ្រាន់តែអានលេខ',
    media: photo('photo-1485827404703-89b55fcc595e', 'Robot and automation technology'),
  },
  {
    title: 'DevOps: CI/CD ជួយឱ្យ team ship ដោយទុកចិត្ត',
    media: photo('photo-1558494949-ef010cbdcc31', 'Server room and cloud infrastructure'),
  },
  {
    title: 'UX Research: សួរអ្នកប្រើ មុនបន្ថែម feature',
    media: photo('photo-1561070791-2526d30994b5', 'UX design sketches and product wireframes'),
  },
  {
    title: 'Financial Literacy: អាន chart ដើម្បីសម្រេចចិត្ត',
    media: photo('photo-1460925895917-afdab827c52f', 'Business data charts on a laptop'),
  },
  {
    title: 'Environmental Science: ថាមពលស្អាត និង grid thinking',
    media: photo('photo-1509391366360-2e959784a276', 'Solar panels for renewable energy study'),
  },
  {
    title: 'Quiz: JavaScript async និង error handling',
    media: photo('photo-1461749280684-dccba630e2f6', 'Programming code editor on a laptop screen'),
  },
  {
    title: 'Quiz: AI workflow និង prompt ដែលមានគុណភាព',
    media: photo('photo-1620712943543-bcc4688e7485', 'Artificial intelligence robot concept'),
  },
  {
    title: 'Quiz: Biology និង scientific experiment',
    media: photo('photo-1576086213369-97a306d36557', 'Biology research lab equipment'),
  },
  {
    title: 'Quiz: Math concepts សម្រាប់ AI និង physics',
    media: photo('photo-1635070041078-e363dbe005cb', 'Mathematical equations and calculations'),
  },
  {
    title: 'Poll: អ្នកចង់ឱ្យ Stunity បង្កើត course អ្វីមុនគេ?',
    media: photo('photo-1516321318423-f06f85e504b3', 'Online learning course on laptop'),
  },
  {
    title: 'Poll: ជំនាញណាដែលអ្នកគិតថាសំខាន់បំផុតសម្រាប់ឆ្នាំនេះ?',
    media: photo('photo-1517048676732-d65bc937f952', 'Team collaboration and professional skills discussion'),
  },
];

async function main() {
  let updated = 0;
  const missing = [];

  for (const item of replacements) {
    const result = await prisma.post.updateMany({
      where: { title: item.title },
      data: {
        mediaUrls: [item.media.url],
        mediaKeys: [],
        mediaDisplayMode: 'AUTO',
        mediaMetadata: [item.media],
        mediaAspectRatio: item.media.aspectRatio,
      },
    });

    if (result.count === 0) missing.push(item.title);
    updated += result.count;
  }

  console.log(JSON.stringify({
    updated,
    requested: replacements.length,
    missing,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
