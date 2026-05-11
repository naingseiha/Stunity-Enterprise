import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const imageDir = path.join(rootDir, 'services/feed-service/uploads/images');

const officialEmails = ['admin@stunity.com', 'naing.seiha.hs@moeys.gov.kh'];

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function daysAgo(index) {
  const date = new Date();
  date.setHours(8 + (index % 10), (index * 7) % 60, 0, 0);
  date.setDate(date.getDate() - Math.floor(index / 3));
  return date;
}

async function createCardImage(asset) {
  const {
    slug,
    title,
    kicker,
    subtitle,
    palette,
    motif,
    code = [],
    stat,
  } = asset;

  const [bgA, bgB, accent, accent2, ink] = palette;
  const motifMarkup = {
    code: `
      <rect x="86" y="154" width="500" height="342" rx="22" fill="#07111f" opacity="0.94"/>
      <circle cx="126" cy="194" r="9" fill="#ff6b6b"/>
      <circle cx="158" cy="194" r="9" fill="#ffd166"/>
      <circle cx="190" cy="194" r="9" fill="#06d6a0"/>
      ${code.map((line, index) => `<text x="126" y="${250 + index * 38}" class="mono" fill="${index % 2 ? '#b8c7dc' : accent}">${escapeXml(line)}</text>`).join('')}
      <path d="M760 170h230v78H760zM700 330h360v86H700zM800 500h160v58H800z" fill="none" stroke="${accent2}" stroke-width="6" opacity="0.72"/>
      <path d="M990 248v82M880 416v84" stroke="${accent2}" stroke-width="6" opacity="0.72"/>
    `,
    diagram: `
      <rect x="122" y="196" width="210" height="90" rx="18" fill="#ffffff" opacity="0.92"/>
      <rect x="494" y="196" width="210" height="90" rx="18" fill="#ffffff" opacity="0.92"/>
      <rect x="866" y="196" width="210" height="90" rx="18" fill="#ffffff" opacity="0.92"/>
      <rect x="308" y="410" width="584" height="110" rx="22" fill="#07111f" opacity="0.9"/>
      <path d="M332 241h162M704 241h162M600 286v124" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
      <text x="166" y="252" class="node">CLIENT</text>
      <text x="548" y="252" class="node">API</text>
      <text x="918" y="252" class="node">DATA</text>
      <text x="372" y="478" class="mono" fill="${accent2}">cache • queue • observability</text>
    `,
    science: `
      <circle cx="310" cy="310" r="132" fill="#ffffff" opacity="0.9"/>
      <circle cx="310" cy="310" r="58" fill="${accent}" opacity="0.95"/>
      <path d="M610 170c-90 80-90 210 0 290s90 210 0 290M760 170c90 80 90 210 0 290s-90 210 0 290" fill="none" stroke="${accent2}" stroke-width="12" stroke-linecap="round"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${620 + i * 25} ${218 + i * 72}h130" stroke="#fff" stroke-width="8" opacity="0.78"/>`).join('')}
      <circle cx="920" cy="450" r="84" fill="#07111f" opacity="0.9"/>
      <text x="878" y="464" class="node" fill="#fff">LAB</text>
    `,
    math: `
      <path d="M126 480c120-230 220-230 340 0s220 230 340 0 190-230 288 0" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
      <rect x="140" y="150" width="350" height="210" rx="26" fill="#ffffff" opacity="0.92"/>
      <text x="188" y="236" class="formula">f(x)=mx+b</text>
      <text x="188" y="300" class="formula">∑ x²</text>
      <circle cx="820" cy="270" r="120" fill="#07111f" opacity="0.9"/>
      <path d="M760 270h120M820 210v120" stroke="${accent2}" stroke-width="12" stroke-linecap="round"/>
    `,
    business: `
      <rect x="116" y="168" width="280" height="310" rx="22" fill="#ffffff" opacity="0.9"/>
      <rect x="460" y="238" width="280" height="240" rx="22" fill="#ffffff" opacity="0.9"/>
      <rect x="804" y="110" width="280" height="368" rx="22" fill="#ffffff" opacity="0.9"/>
      <path d="M170 402l140-92 140 42 140-118 140 52 190-142" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="156" y="238" class="node">IDEA</text>
      <text x="504" y="322" class="node">MARKET</text>
      <text x="850" y="204" class="node">GROWTH</text>
    `,
    engineering: `
      <path d="M100 500h1000" stroke="#fff" stroke-width="14" opacity="0.86"/>
      <path d="M180 500L330 260l150 240M480 500l150-240 150 240M780 500l150-240 150 240" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="330" cy="260" r="24" fill="${accent2}"/>
      <circle cx="630" cy="260" r="24" fill="${accent2}"/>
      <circle cx="930" cy="260" r="24" fill="${accent2}"/>
      <rect x="160" y="560" width="880" height="44" rx="22" fill="#07111f" opacity="0.88"/>
    `,
  }[motif];

  const svg = `
    <svg width="1200" height="675" viewBox="0 0 1200 675" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${bgA}"/>
          <stop offset="1" stop-color="${bgB}"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.22"/>
        </filter>
        <style>
          .kicker { font: 700 28px Arial, sans-serif; letter-spacing: 4px; }
          .title { font: 800 72px Arial, sans-serif; letter-spacing: 0; }
          .subtitle { font: 500 32px Arial, sans-serif; letter-spacing: 0; }
          .mono { font: 500 28px "Menlo", "Consolas", monospace; }
          .node { font: 800 28px Arial, sans-serif; letter-spacing: 2px; fill: #0b1628; }
          .formula { font: 800 42px Arial, sans-serif; fill: #0b1628; }
        </style>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)"/>
      <circle cx="1060" cy="86" r="170" fill="#fff" opacity="0.11"/>
      <circle cx="112" cy="608" r="210" fill="#fff" opacity="0.10"/>
      <g filter="url(#shadow)">${motifMarkup}</g>
      <rect x="64" y="48" width="410" height="64" rx="32" fill="#fff" opacity="0.92"/>
      <text x="94" y="90" class="kicker" fill="${ink}">${escapeXml(kicker)}</text>
      <text x="64" y="598" class="title" fill="#fff">${escapeXml(title)}</text>
      <text x="68" y="642" class="subtitle" fill="#fff" opacity="0.9">${escapeXml(subtitle)}</text>
      ${stat ? `<rect x="782" y="548" width="350" height="70" rx="35" fill="#fff" opacity="0.92"/><text x="824" y="593" class="subtitle" fill="${ink}">${escapeXml(stat)}</text>` : ''}
    </svg>
  `;

  const filename = `learning-seed-${slug}.png`;
  await sharp(Buffer.from(svg)).png({ quality: 92 }).toFile(path.join(imageDir, filename));
  return `/uploads/images/${filename}`;
}

async function createOfficialAvatar(filename, initials, palette) {
  const [bgA, bgB, accent] = palette;
  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${bgA}"/>
          <stop offset="1" stop-color="${bgB}"/>
        </linearGradient>
        <style>
          .initials { font: 800 150px Arial, sans-serif; letter-spacing: 0; }
          .label { font: 700 34px Arial, sans-serif; letter-spacing: 4px; }
        </style>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#bg)"/>
      <circle cx="404" cy="92" r="90" fill="#fff" opacity="0.16"/>
      <circle cx="88" cy="426" r="130" fill="#fff" opacity="0.14"/>
      <rect x="92" y="104" width="328" height="304" rx="70" fill="#fff" opacity="0.92"/>
      <text x="256" y="278" class="initials" fill="${accent}" text-anchor="middle">${escapeXml(initials)}</text>
      <text x="256" y="348" class="label" fill="${accent}" text-anchor="middle">OFFICIAL</text>
    </svg>
  `;
  await sharp(Buffer.from(svg)).png({ quality: 92 }).toFile(path.join(imageDir, filename));
  return `/uploads/images/${filename}`;
}

const assets = [
  { slug: 'javascript-async', title: 'ASYNC JS', kicker: 'PROGRAMMING', subtitle: 'Promises • await • error flow', palette: ['#0f172a', '#2563eb', '#38bdf8', '#facc15', '#0f172a'], motif: 'code', code: ['const data = await api()', 'try { render(data) }', 'catch (e) { retry() }'], stat: 'Cheat Sheet' },
  { slug: 'python-data', title: 'PYTHON DATA', kicker: 'ANALYTICS', subtitle: 'Clean • group • visualize', palette: ['#123524', '#16a34a', '#86efac', '#fbbf24', '#123524'], motif: 'code', code: ['df.dropna()', 'df.groupby("class")', 'plt.plot(result)'], stat: 'Notebook' },
  { slug: 'ai-workflow', title: 'AI WORKFLOW', kicker: 'ARTIFICIAL INTELLIGENCE', subtitle: 'Prompt • evaluate • improve', palette: ['#312e81', '#db2777', '#f9a8d4', '#a7f3d0', '#312e81'], motif: 'diagram', stat: '5 steps' },
  { slug: 'system-design', title: 'SYSTEM DESIGN', kicker: 'ARCHITECTURE', subtitle: 'Scale with cache and queues', palette: ['#111827', '#475569', '#67e8f9', '#f97316', '#111827'], motif: 'diagram', stat: 'High Load' },
  { slug: 'database-index', title: 'DATABASES', kicker: 'SQL INDEXING', subtitle: 'Query plans that stay fast', palette: ['#164e63', '#0f766e', '#99f6e4', '#fde047', '#164e63'], motif: 'code', code: ['CREATE INDEX idx_feed', 'ON posts(created_at);', 'EXPLAIN ANALYZE ...'], stat: 'Optimization' },
  { slug: 'cybersecurity', title: 'SECURITY', kicker: 'CYBER BASICS', subtitle: 'Threat model before launch', palette: ['#3f1d1d', '#be123c', '#fb7185', '#fef08a', '#3f1d1d'], motif: 'diagram', stat: 'Checklist' },
  { slug: 'business-model', title: 'BUSINESS', kicker: 'STARTUP STUDY', subtitle: 'Problem • customer • value', palette: ['#1f2937', '#059669', '#34d399', '#f59e0b', '#1f2937'], motif: 'business', stat: 'Canvas' },
  { slug: 'english-vocab', title: 'ENGLISH', kicker: 'LANGUAGE STUDY', subtitle: 'Read • speak • reflect', palette: ['#172554', '#0891b2', '#93c5fd', '#fcd34d', '#172554'], motif: 'business', stat: 'IELTS' },
  { slug: 'linear-algebra', title: 'MATH', kicker: 'LINEAR ALGEBRA', subtitle: 'Vectors make AI possible', palette: ['#422006', '#ca8a04', '#fef08a', '#38bdf8', '#422006'], motif: 'math', stat: 'Matrices' },
  { slug: 'physics-circuits', title: 'PHYSICS', kicker: 'ELECTRIC CIRCUITS', subtitle: 'Voltage • current • power', palette: ['#0c4a6e', '#7c3aed', '#facc15', '#22d3ee', '#0c4a6e'], motif: 'math', stat: 'Ohm Law' },
  { slug: 'biology-cell', title: 'BIOLOGY', kicker: 'CELL SCIENCE', subtitle: 'DNA • protein • energy', palette: ['#14532d', '#84cc16', '#bbf7d0', '#f472b6', '#14532d'], motif: 'science', stat: 'Lab Notes' },
  { slug: 'chemistry-lab', title: 'CHEMISTRY', kicker: 'REACTIONS', subtitle: 'Observe • measure • explain', palette: ['#581c87', '#7e22ce', '#c4b5fd', '#fef08a', '#581c87'], motif: 'science', stat: 'Practice' },
  { slug: 'architecture-bridge', title: 'ENGINEERING', kicker: 'STRUCTURE', subtitle: 'Forces become design', palette: ['#1e293b', '#0ea5e9', '#bae6fd', '#fb923c', '#1e293b'], motif: 'engineering', stat: 'Bridge' },
  { slug: 'robotics-iot', title: 'ROBOTICS', kicker: 'IOT PROJECT', subtitle: 'Sensors • control • feedback', palette: ['#1c1917', '#ea580c', '#fdba74', '#a7f3d0', '#1c1917'], motif: 'engineering', stat: 'Prototype' },
  { slug: 'devops-cloud', title: 'DEVOPS', kicker: 'CLOUD BUILD', subtitle: 'Ship reliably every week', palette: ['#064e3b', '#0284c7', '#7dd3fc', '#fbbf24', '#064e3b'], motif: 'diagram', stat: 'CI/CD' },
  { slug: 'ux-research', title: 'UX DESIGN', kicker: 'PRODUCT STUDY', subtitle: 'Test with real learners', palette: ['#831843', '#f97316', '#fed7aa', '#a7f3d0', '#831843'], motif: 'business', stat: 'Research' },
  { slug: 'finance-data', title: 'FINANCE', kicker: 'DATA LITERACY', subtitle: 'Budget • risk • decision', palette: ['#052e16', '#65a30d', '#bef264', '#38bdf8', '#052e16'], motif: 'business', stat: 'Charts' },
  { slug: 'environment-energy', title: 'SCIENCE', kicker: 'ENERGY SYSTEMS', subtitle: 'Solar • grid • sustainability', palette: ['#134e4a', '#22c55e', '#bbf7d0', '#facc15', '#134e4a'], motif: 'engineering', stat: 'Renewables' },
];

function quizQuestions(topic) {
  const bank = {
    programming: [
      { question: 'តើ async/await ជួយអ្វីក្នុង JavaScript?', options: ['ធ្វើឱ្យកូដ asynchronous អានងាយជាងមុន', 'បង្កើនទំហំ database', 'បិទ network request', 'លុប error ទាំងអស់'], correctAnswer: 0, explanation: 'async/await ជួយសរសេរកូដ asynchronous ដូចជា flow ធម្មតា ហើយងាយ debug។', points: 10 },
      { question: 'តើ try/catch ប្រើសម្រាប់អ្វី?', options: ['គ្រប់គ្រង error', 'បង្កើត CSS', 'ធ្វើ indexing', 'បញ្ជូន email'], correctAnswer: 0, explanation: 'try/catch គឺ pattern សម្រាប់ចាប់ exception និង fallback ឱ្យ app មិន crash។', points: 10 },
    ],
    ai: [
      { question: 'តើ evaluation សំខាន់យ៉ាងដូចម្តេចក្នុង AI workflow?', options: ['វាស់ថាលទ្ធផលល្អ និងគួរឱ្យទុកចិត្តឬអត់', 'ធ្វើឱ្យ prompt វែងជានិច្ច', 'លុប data ទាំងអស់', 'ជំនួសការរៀនមូលដ្ឋាន'], correctAnswer: 0, explanation: 'AI ដែលល្អត្រូវមានការវាស់លទ្ធផលជាប្រចាំ មិនមែន rely លើអារម្មណ៍តែប៉ុណ្ណោះ។', points: 10 },
      { question: 'Prompt ល្អគួរមានអ្វីខ្លះ?', options: ['គោលដៅ បរិបទ និងទ្រង់ទ្រាយលទ្ធផល', 'ពាក្យសម្ងាត់ផ្ទាល់ខ្លួន', 'សំណួរមិនច្បាស់', 'តែ command មួយពាក្យ'], correctAnswer: 0, explanation: 'បរិបទច្បាស់ និង output format ធ្វើឱ្យ model ឆ្លើយមានស្ថេរភាពជាងមុន។', points: 10 },
    ],
    science: [
      { question: 'តើ DNA មានតួនាទីសំខាន់អ្វី?', options: ['ផ្ទុកព័ត៌មានតំណពូជ', 'ផលិតអគ្គិសនីដោយផ្ទាល់', 'បំបែកថ្ម', 'បង្កើតសម្លេង'], correctAnswer: 0, explanation: 'DNA ផ្ទុក instruction សម្រាប់ការរីកលូតលាស់ និងមុខងាររបស់កោសិកា។', points: 10 },
      { question: 'តើ control variable ក្នុងពិសោធន៍មានន័យថាអ្វី?', options: ['អថេរដែលរក្សាឱ្យថេរ', 'អថេរដែលបោះចោល', 'លទ្ធផលចុងក្រោយ', 'ឧបករណ៍វាស់'], correctAnswer: 0, explanation: 'ការរក្សា control variable ឱ្យថេរ ជួយឱ្យយើងដឹងថាការផ្លាស់ប្តូរមកពីអថេរសំខាន់។', points: 10 },
    ],
    math: [
      { question: 'តើ vector អាចតំណាងឱ្យអ្វី?', options: ['ទិស និងទំហំ', 'តែពណ៌', 'តែលេខទូរស័ព្ទ', 'database table'], correctAnswer: 0, explanation: 'Vector មានទាំង magnitude និង direction ហើយប្រើច្រើនក្នុង physics, AI និង graphics។', points: 10 },
      { question: 'តើ derivative ប្រាប់យើងពីអ្វី?', options: ['អត្រាប្រែប្រួល', 'ចំនួនអក្សរ', 'រូបភាពក្នុង post', 'ប្រវែង paragraph'], correctAnswer: 0, explanation: 'Derivative ជាវិធីគណនាអត្រាប្រែប្រួលនៅចំណុចមួយ។', points: 10 },
    ],
  };
  return bank[topic];
}

function buildPosts(authorByEmail, mediaBySlug) {
  const admin = authorByEmail.get('admin@stunity.com');
  const moeys = authorByEmail.get('naing.seiha.hs@moeys.gov.kh');
  const rows = [
    {
      author: admin,
      title: 'Cheat Sheet: JavaScript async/await សម្រាប់អ្នកចាប់ផ្តើម',
      content: 'បើអ្នកកំពុងរៀន JavaScript សម្រាប់ web app សូមចាំ ៣ ចំណុចនេះ៖\n\n1. `async` ធ្វើឱ្យ function ត្រឡប់ Promise\n2. `await` រង់ចាំលទ្ធផលដោយមិនបិទ UI\n3. `try/catch` គឺជាខ្សែការពារ ពេល API មានបញ្ហា\n\nលំហាត់ថ្ងៃនេះ៖ សរសេរ function មួយ fetch data ពី API ហើយបង្ហាញ loading, success និង error state ឱ្យបានច្បាស់។',
      postType: 'RESOURCE',
      image: 'javascript-async',
      topicTags: ['programming', 'javascript', 'web-development', 'cheatsheet'],
      resourceType: 'IMAGE',
      difficultyLevel: 2.2,
    },
    {
      author: moeys,
      title: 'Python Data Analysis: ពី raw data ទៅ insight',
      content: 'ការរៀន data analysis មិនមែនចាប់ផ្តើមពី chart ទេ។ ចាប់ផ្តើមពីការសួរថា “data នេះកំពុងប្រាប់អ្វី?”\n\nWorkflow ងាយចាំ៖\n- សម្អាត missing value\n- ពិនិត្យ outlier\n- group by សំណួរសំខាន់\n- visualize តែអ្វីដែលជួយសម្រេចចិត្ត\n\nសម្រាប់សិស្ស៖ សាកល្បងយកពិន្ទុប្រចាំខែ ហើយរកមើលមុខវិជ្ជាណាដែលត្រូវការជំនួយបន្ថែម។',
      postType: 'TUTORIAL',
      image: 'python-data',
      topicTags: ['python', 'data-science', 'statistics', 'study-skills'],
      tutorialDifficulty: 'BEGINNER',
      tutorialEstimatedTime: '25 minutes',
      difficultyLevel: 2.6,
    },
    {
      author: admin,
      title: 'AI Prompt Engineering: គិតដូចអ្នកបង្រៀន មុនសួរ AI',
      content: 'Prompt ល្អគួរមាន ៤ ផ្នែក៖ គោលដៅ បរិបទ កម្រិតអ្នករៀន និងទ្រង់ទ្រាយលទ្ធផល។\n\nឧទាហរណ៍៖ “ពន្យល់ binary search ជាភាសាខ្មែរ សម្រាប់សិស្សថ្នាក់ទី ១០ ដោយមាន example និង quiz ៣ សំណួរ។”\n\nចំណាំ៖ កុំបញ្ចូល password ឬព័ត៌មានឯកជនទៅក្នុង AI tool។',
      postType: 'ARTICLE',
      image: 'ai-workflow',
      topicTags: ['ai', 'prompt-engineering', 'digital-literacy', 'productivity'],
      difficultyLevel: 2.4,
    },
    {
      author: moeys,
      title: 'System Design: បង្កើត Feed ដែលទ្រាំ heavy load',
      content: 'Feed ដែលលឿនមិនមែន rely លើ database query តែមួយទេ។ វាត្រូវការរចនាដូចជា៖\n\n- cursor pagination ជំនួស offset\n- cache សម្រាប់ result ដែលគេសួរញឹកញាប់\n- ranking score សម្រាប់ suggestion\n- real-time update ដោយ fanout ឬ event stream\n- observability ដើម្បីដឹងថា bottleneck នៅណា\n\nសំណួរសម្រាប់អ្នករៀន៖ តើ cache គួរផុតកំណត់នៅពេលណា ដើម្បីមិនបង្ហាញ data ចាស់ពេក?',
      postType: 'ARTICLE',
      image: 'system-design',
      topicTags: ['system-design', 'architecture', 'performance', 'feed'],
      difficultyLevel: 3.7,
    },
    {
      author: admin,
      title: 'Database Indexing: ចំណុចតូចដែលធ្វើឱ្យ app លឿន',
      content: 'ពេល feed ចាប់ផ្តើមមាន post រាប់ពាន់ ឬរាប់លាន row, index គឺសំខាន់ណាស់។\n\nសម្រាប់ feed query ធម្មតា អ្នកគួរគិតពី index លើ៖\n- `createdAt DESC`\n- `visibility`\n- `authorId`\n- `topicTags` ប្រសិនបើមាន recommendation\n\nកុំបង្កើត index ច្រើនពេក។ Index ជួយ read តែអាចធ្វើឱ្យ write យឺតបន្តិច។',
      postType: 'RESOURCE',
      image: 'database-index',
      topicTags: ['database', 'sql', 'performance', 'backend'],
      resourceType: 'IMAGE',
      difficultyLevel: 3.3,
    },
    {
      author: moeys,
      title: 'Cybersecurity Checklist មុន publish project',
      content: 'មុនដាក់ project អោយអ្នកដទៃប្រើ សូមពិនិត្យ៖\n\n- មិន hard-code API key ក្នុង frontend\n- validate input ទាំង client និង server\n- rate limit endpoint សំខាន់ៗ\n- log error ដោយមិនបញ្ចេញ personal data\n- backup database និងសាកល្បង restore\n\nសុវត្ថិភាពល្អ គឺជាទម្លាប់ប្រចាំថ្ងៃ មិនមែនជាការងារចុងក្រោយមុន launch ទេ។',
      postType: 'ARTICLE',
      image: 'cybersecurity',
      topicTags: ['cybersecurity', 'backend', 'production', 'engineering'],
      difficultyLevel: 3.1,
    },
    {
      author: admin,
      title: 'Business Model Canvas សម្រាប់សិស្សដែលចង់ចាប់ផ្តើម Startup',
      content: 'គំនិតល្អមួយត្រូវការផ្លូវទៅកាន់អ្នកប្រើប្រាស់។ សាកល្បងសរសេរ Business Model Canvas ដោយឆ្លើយ៖\n\n1. អ្នកកំពុងដោះស្រាយបញ្ហាអ្វី?\n2. អ្នកណាជាអ្នកប្រើប្រាស់ដំបូង?\n3. តម្លៃដែលអ្នកផ្តល់ជូនខុសពីគេយ៉ាងដូចម្តេច?\n4. តើអ្នកវាស់ success ដោយ metric អ្វី?\n\nកុំចាំ perfect product។ ចាប់ផ្តើមពី problem ដែលច្បាស់។',
      postType: 'COURSE',
      image: 'business-model',
      topicTags: ['business', 'startup', 'entrepreneurship', 'career'],
      courseCode: 'BUS-101',
      courseLevel: 'BEGINNER',
      courseDuration: '2 weeks',
      difficultyLevel: 2.1,
    },
    {
      author: moeys,
      title: 'English Study: រៀន vocabulary ដោយប្រើ context',
      content: 'កុំចាំពាក្យ English ដាច់ដោយឡែក។ រៀនវាជាមួយ sentence និង situation។\n\nឧទាហរណ៍៖\n- “analyze” = ពិនិត្យឱ្យយល់ពីមូលហេតុ\n- “evaluate” = វាយតម្លៃតាម criteria\n- “summarize” = សង្ខេបចំណុចសំខាន់\n\nលំហាត់៖ យក article មួយពី LinkedIn ឬ news ហើយសរសេរ summary ៥ ប្រយោគជាភាសាអង់គ្លេស។',
      postType: 'TUTORIAL',
      image: 'english-vocab',
      topicTags: ['english', 'language-learning', 'ielts', 'communication'],
      tutorialDifficulty: 'BEGINNER',
      tutorialEstimatedTime: '15 minutes',
      difficultyLevel: 1.9,
    },
    {
      author: admin,
      title: 'Linear Algebra: មូលដ្ឋានដែលនៅពីក្រោយ AI',
      content: 'AI និង machine learning ប្រើ vector និង matrix រាល់ថ្ងៃ។ បើអ្នកយល់ dot product, matrix multiplication និង dimension អ្នកនឹងអាន model explanation ងាយជាងមុន។\n\nTip៖ កុំរៀន formula តែម្នាក់ឯង។ គូរ diagram ហើយសួរថា “លេខនេះតំណាងឱ្យអ្វី?”',
      postType: 'ARTICLE',
      image: 'linear-algebra',
      topicTags: ['math', 'linear-algebra', 'ai', 'machine-learning'],
      difficultyLevel: 3.2,
    },
    {
      author: moeys,
      title: 'Physics: Ohm’s Law មិនមែនត្រឹមចាំสูตรទេ',
      content: '`V = I × R` គឺជាសមីការងាយ ប៉ុន្តែគំនិតសំខាន់គឺ relationship។ បើ resistance ឡើង current នឹងថយ នៅពេល voltage ថេរ។\n\nលំហាត់តូច៖ battery 12V ភ្ជាប់ resistor 6Ω។ តើ current ស្មើប៉ុន្មាន ampere?\n\nចម្លើយ៖ 2A។ សាកសរសេរពន្យល់ជាពាក្យផ្ទាល់ខ្លួន មុនមើល solution។',
      postType: 'QUESTION',
      image: 'physics-circuits',
      topicTags: ['physics', 'electronics', 'science', 'problem-solving'],
      difficultyLevel: 2.0,
    },
    {
      author: admin,
      title: 'Biology: ពី DNA ទៅ Protein',
      content: 'Central dogma ក្នុង Biology អាចចាំខ្លីៗ៖ DNA → RNA → Protein។\n\nDNA ផ្ទុក instruction, RNA ជាសារចម្លង, Protein ជាអ្នកធ្វើការជាក់ស្តែងក្នុងកោសិកា។\n\nសម្រាប់ការរៀន៖ គូរ flow មួយ ហើយសរសេរឧទាហរណ៍ protein មួយដែលអ្នកស្គាល់ ដូចជា insulin ឬ collagen។',
      postType: 'RESOURCE',
      image: 'biology-cell',
      topicTags: ['biology', 'dna', 'science', 'study-notes'],
      resourceType: 'IMAGE',
      difficultyLevel: 2.5,
    },
    {
      author: moeys,
      title: 'Chemistry Lab: សុវត្ថិភាពមុនពិសោធន៍',
      content: 'ពិសោធន៍ល្អចាប់ផ្តើមពី safety។ មុនចាប់ផ្តើម៖\n\n- ពាក់ eye protection\n- អាន label chemical\n- មិនលាយសារធាតុដោយគ្មាន instruction\n- កត់ observation ភ្លាមៗ\n- សម្អាត workspace ក្រោយចប់\n\nអ្នកវិទ្យាសាស្ត្រល្អ គឺអ្នកដែលគិតច្បាស់ និងធ្វើដោយប្រុងប្រយ័ត្ន។',
      postType: 'ARTICLE',
      image: 'chemistry-lab',
      topicTags: ['chemistry', 'lab-safety', 'science', 'experiment'],
      difficultyLevel: 1.8,
    },
    {
      author: admin,
      title: 'Architecture & Engineering: កម្លាំងក្លាយជារចនា',
      content: 'ស្ពានល្អមិនត្រឹមស្អាតទេ។ វាត្រូវចែកចាយ load ឱ្យមានស្ថេរភាព។\n\nនៅក្នុង truss bridge, triangle គឺ shape សំខាន់ ព្រោះវាមិនងាយបត់បែនក្រោមកម្លាំង។\n\nលំហាត់៖ រចនាស្ពានក្រដាសដែលអាចទ្រាំសៀវភៅ ៥ ក្បាល ហើយកត់ថា failure កើតឡើងនៅចំណុចណា។',
      postType: 'PROJECT',
      image: 'architecture-bridge',
      topicTags: ['engineering', 'architecture', 'physics', 'project-based-learning'],
      projectStatus: 'PLANNING',
      projectTeamSize: 3,
      difficultyLevel: 2.9,
    },
    {
      author: moeys,
      title: 'Robotics & IoT: Sensor មិនមែនគ្រាន់តែអានលេខ',
      content: 'Robot ល្អត្រូវមាន feedback loop៖ sensor អានបរិយាកាស, controller សម្រេចចិត្ត, actuator ធ្វើសកម្មភាព, ហើយ system វាស់លទ្ធផលវិញ។\n\nProject idea៖ ប្រើ ultrasonic sensor វាស់ចម្ងាយ ហើយបើវត្ថុនៅជិតពេក សូមបើក buzzer ឬ LED។',
      postType: 'COURSE',
      image: 'robotics-iot',
      topicTags: ['robotics', 'iot', 'engineering', 'arduino'],
      courseCode: 'ROB-201',
      courseLevel: 'INTERMEDIATE',
      courseDuration: '4 weeks',
      difficultyLevel: 3.0,
    },
    {
      author: admin,
      title: 'DevOps: CI/CD ជួយឱ្យ team ship ដោយទុកចិត្ត',
      content: 'CI/CD មិនមែនមានតែ script build ទេ។ វាជាវប្បធម៌នៃការត្រួតពិនិត្យគុណភាពជាបន្តបន្ទាប់។\n\nPipeline ល្អគួរមាន៖\n- lint និង type check\n- unit/integration test\n- build artifact\n- smoke test បន្ទាប់ deploy\n- rollback plan\n\nការដាក់ production គួរតែធុញ ប៉ុន្តែអាចទុកចិត្តបាន។',
      postType: 'ARTICLE',
      image: 'devops-cloud',
      topicTags: ['devops', 'cloud', 'ci-cd', 'production'],
      difficultyLevel: 3.4,
    },
    {
      author: moeys,
      title: 'UX Research: សួរអ្នកប្រើ មុនបន្ថែម feature',
      content: 'Feature ដែលយើងគិតថាល្អ អាចមិនមែនជាអ្វីដែលអ្នកប្រើត្រូវការបំផុតទេ។\n\nសាកល្បង interview ៥ នាក់ ដោយសួរ៖\n- អ្នកកំពុងពិបាកនៅជំហានណា?\n- អ្នកធ្វើ workaround ដូចម្តេច?\n- អ្វីដែលធ្វើឱ្យអ្នកបោះបង់?\n\nInsight តូចៗអាចសន្សំពេល build បានច្រើន។',
      postType: 'ARTICLE',
      image: 'ux-research',
      topicTags: ['ux', 'product-design', 'research', 'business'],
      difficultyLevel: 2.7,
    },
    {
      author: admin,
      title: 'Financial Literacy: អាន chart ដើម្បីសម្រេចចិត្ត',
      content: 'Data chart ល្អមិនគ្រាន់តែស្អាតទេ។ វាគួរឆ្លើយសំណួរមួយឱ្យច្បាស់។\n\nពេលមើល chart សូមសួរ៖\n- Axis បង្ហាញអ្វី?\n- Scale ត្រឹមត្រូវឬអត់?\n- Trend កើន ធ្លាក់ ឬ seasonal?\n- តើមាន outlier ដែលត្រូវពិនិត្យបន្ថែមទេ?\n\nជំនាញនេះប្រើបានទាំងក្នុង business, science និងការរស់នៅប្រចាំថ្ងៃ។',
      postType: 'RESOURCE',
      image: 'finance-data',
      topicTags: ['business', 'finance', 'data-literacy', 'charts'],
      resourceType: 'IMAGE',
      difficultyLevel: 2.3,
    },
    {
      author: moeys,
      title: 'Environmental Science: ថាមពលស្អាត និង grid thinking',
      content: 'Solar panel មិនមែនជាចម្លើយតែមួយគត់ទេ។ ប្រព័ន្ធថាមពលត្រូវគិតពី generation, storage, demand និង transmission។\n\nសំណួរពិភាក្សា៖ បើសាលារៀនមួយចង់ប្រើ solar power តើត្រូវវាស់ data អ្វីខ្លះ មុនសម្រេចចិត្ត?',
      postType: 'RESEARCH',
      image: 'environment-energy',
      topicTags: ['environment', 'energy', 'science', 'sustainability'],
      researchField: 'Energy Systems',
      researchCollaborators: 'Science Club',
      difficultyLevel: 2.8,
    },
    {
      author: admin,
      title: 'Quiz: JavaScript async និង error handling',
      content: 'សាកល្បង quiz ខ្លីនេះ ដើម្បីពិនិត្យថាអ្នកយល់ពី async/await និង error handling ប៉ុណ្ណា។ កុំមើលចម្លើយមុនធ្វើ។',
      postType: 'QUIZ',
      image: 'javascript-async',
      topicTags: ['quiz', 'javascript', 'programming'],
      quizTopic: 'programming',
      difficultyLevel: 2.1,
    },
    {
      author: moeys,
      title: 'Quiz: AI workflow និង prompt ដែលមានគុណភាព',
      content: 'AI ជួយរៀនបានល្អ ពេលយើងមានសំណួរច្បាស់ និងវាស់លទ្ធផលបាន។ ធ្វើ quiz នេះ ដើម្បីពង្រឹងគំនិត។',
      postType: 'QUIZ',
      image: 'ai-workflow',
      topicTags: ['quiz', 'ai', 'prompt-engineering'],
      quizTopic: 'ai',
      difficultyLevel: 2.4,
    },
    {
      author: admin,
      title: 'Quiz: Biology និង scientific experiment',
      content: 'សំណួរខ្លីៗសម្រាប់អ្នករៀន Biology និងវិធីគិតបែបវិទ្យាសាស្ត្រ។ ចាប់ផ្តើមពីមូលដ្ឋាន ប៉ុន្តែពន្យល់ដោយហេតុផល។',
      postType: 'QUIZ',
      image: 'biology-cell',
      topicTags: ['quiz', 'biology', 'science'],
      quizTopic: 'science',
      difficultyLevel: 2.2,
    },
    {
      author: moeys,
      title: 'Quiz: Math concepts សម្រាប់ AI និង physics',
      content: 'Vector, derivative និង matrix គឺជាគំនិតដែលត្រូវប្រើឡើងវិញជាញឹកញាប់។ ធ្វើ quiz នេះ ហើយកត់ចំណុចដែលត្រូវរំលឹកបន្ថែម។',
      postType: 'QUIZ',
      image: 'linear-algebra',
      topicTags: ['quiz', 'math', 'linear-algebra'],
      quizTopic: 'math',
      difficultyLevel: 2.6,
    },
    {
      author: admin,
      title: 'Poll: អ្នកចង់ឱ្យ Stunity បង្កើត course អ្វីមុនគេ?',
      content: 'យើងកំពុងរៀបចំ learning content ជាភាសាខ្មែរ។ ជួយ vote topic ដែលអ្នកចង់រៀនមុនគេ ដើម្បីឱ្យ feed ផ្តល់អត្ថប្រយោជន៍ពិត។',
      postType: 'POLL',
      image: 'devops-cloud',
      topicTags: ['poll', 'course', 'learning-roadmap'],
      pollOptions: ['Programming & Web Development', 'AI for Study', 'English Communication', 'System Design'],
      pollExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      difficultyLevel: 1.3,
    },
    {
      author: moeys,
      title: 'Poll: ជំនាញណាដែលអ្នកគិតថាសំខាន់បំផុតសម្រាប់ឆ្នាំនេះ?',
      content: 'ការរៀនល្អចាប់ផ្តើមពីការជ្រើសរើស focus។ Vote មួយ ហើយ comment ថាហេតុអ្វីអ្នកជ្រើសរើសជំនាញនោះ។',
      postType: 'POLL',
      image: 'business-model',
      topicTags: ['poll', 'career', 'skills'],
      pollOptions: ['Problem Solving', 'English', 'Data Literacy', 'Team Collaboration'],
      pollExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      difficultyLevel: 1.2,
    },
  ];

  return rows.map((row, index) => ({
    ...row,
    createdAt: daysAgo(index),
    mediaUrl: mediaBySlug.get(row.image),
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    trendingScore: 0,
  }));
}

async function upsertOfficialUsers() {
  const school = await prisma.school.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });
  const hashedPassword = await bcrypt.hash('StunityOfficial2026!', 10);

  const users = [
    {
      email: 'admin@stunity.com',
      firstName: 'Stunity',
      lastName: 'Admin',
      englishFirstName: 'Stunity',
      englishLastName: 'Admin',
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      headline: 'គណនីផ្លូវការរបស់ Stunity សម្រាប់ចែករំលែកចំណេះដឹង និង learning resources',
      professionalTitle: 'Official Stunity Learning Team',
      bio: 'ចែករំលែកអត្ថបទ សំណួរ quiz, poll និងមេរៀនខ្លីៗសម្រាប់សិស្ស និស្សិត និងអ្នករៀនជំនាញថ្មីៗ។',
      profilePictureUrl: '/uploads/images/stunity-official-avatar.png',
      interests: ['Programming', 'AI', 'System Design', 'Study Skills', 'Khmer Learning Content'],
      skills: ['Learning Design', 'Educational Technology', 'Community Learning'],
    },
    {
      email: 'naing.seiha.hs@moeys.gov.kh',
      firstName: 'Naing Seiha',
      lastName: 'HS',
      englishFirstName: 'Naing Seiha',
      englishLastName: 'HS',
      role: 'ADMIN',
      isSuperAdmin: false,
      headline: 'គណនីផ្លូវការសម្រាប់ចែករំលែកមាតិកាសិក្សា បច្ចេកវិទ្យា និង STEM',
      professionalTitle: 'Learning Content Coordinator',
      bio: 'គាំទ្រការរៀនជាភាសាខ្មែរ តាមរយៈអត្ថបទអប់រំ លំហាត់អនុវត្ត និងសំណួរពិភាក្សាសម្រាប់សហគមន៍ Stunity។',
      profilePictureUrl: '/uploads/images/moeys-official-avatar.png',
      interests: ['STEM', 'English', 'Science', 'Engineering', 'Digital Literacy'],
      skills: ['Education', 'STEM Communication', 'Curriculum Support'],
    },
  ];

  const result = new Map();
  for (const user of users) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      result.set(user.email, existing);
      continue;
    }

    const saved = await prisma.user.create({
      data: {
        schoolId: school?.id,
        email: user.email,
        password: hashedPassword,
        firstName: user.firstName,
        lastName: user.lastName,
        englishFirstName: user.englishFirstName,
        englishLastName: user.englishLastName,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        accountType: 'HYBRID',
        isActive: true,
        isDefaultPassword: false,
        isEmailVerified: true,
        isVerified: true,
        verifiedAt: new Date(),
        socialFeaturesEnabled: true,
        headline: user.headline,
        professionalTitle: user.professionalTitle,
        bio: user.bio,
        profilePictureUrl: user.profilePictureUrl,
        interests: user.interests,
        skills: user.skills,
        languages: ['km', 'en'],
        profileVisibility: 'PUBLIC',
        profileCompleteness: 95,
        profileUpdatedAt: new Date(),
      },
    });
    result.set(user.email, saved);
  }

  return { users: result, school };
}

async function generateAssets() {
  await mkdir(imageDir, { recursive: true });
  const mediaBySlug = new Map();

  await createOfficialAvatar('stunity-official-avatar.png', 'ST', ['#0f172a', '#2563eb', '#0f172a']);
  await createOfficialAvatar('moeys-official-avatar.png', 'MO', ['#14532d', '#16a34a', '#14532d']);

  for (const asset of assets) {
    mediaBySlug.set(asset.slug, await createCardImage(asset));
  }

  return mediaBySlug;
}

async function clearFeed() {
  const postIds = (await prisma.post.findMany({ select: { id: true } })).map((post) => post.id);
  await prisma.post.updateMany({ data: { repostOfId: null } });

  if (postIds.length > 0) {
    await prisma.notification.updateMany({
      where: {
        OR: [
          { postId: { in: postIds } },
          { commentId: { not: null } },
        ],
      },
      data: { postId: null, commentId: null },
    });
    await prisma.postReport.deleteMany({ where: { postId: { in: postIds } } });
  }

  const deletedSignals = await prisma.userFeedSignal.deleteMany({});
  const deletedPosts = await prisma.post.deleteMany({});
  return { deletedPosts: deletedPosts.count, deletedSignals: deletedSignals.count };
}

async function createLearningPosts(authorByEmail, mediaBySlug, schoolId) {
  const posts = buildPosts(authorByEmail, mediaBySlug);
  const created = [];

  for (const [index, post] of posts.entries()) {
    const baseData = {
      authorId: post.author.id,
      schoolId,
      title: post.title,
      content: post.content,
      postType: post.postType,
      visibility: 'PUBLIC',
      mediaUrls: post.mediaUrl ? [post.mediaUrl] : [],
      mediaKeys: [],
      mediaDisplayMode: 'AUTO',
      mediaAspectRatio: 9 / 16,
      mediaMetadata: [
        {
          url: post.mediaUrl,
          type: 'image',
          width: 1200,
          height: 675,
          alt: post.title,
          generatedFor: 'learning-feed-seed',
        },
      ],
      topicTags: post.topicTags,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      trendingScore: post.trendingScore,
      difficultyLevel: post.difficultyLevel,
      createdAt: post.createdAt,
      updatedAt: post.createdAt,
      resourceType: post.resourceType,
      tutorialDifficulty: post.tutorialDifficulty,
      tutorialEstimatedTime: post.tutorialEstimatedTime,
      courseCode: post.courseCode,
      courseLevel: post.courseLevel,
      courseDuration: post.courseDuration,
      projectStatus: post.projectStatus,
      projectTeamSize: post.projectTeamSize,
      researchField: post.researchField,
      researchCollaborators: post.researchCollaborators,
      pollExpiresAt: post.pollExpiresAt,
      pollAllowMultiple: false,
      pollMaxChoices: post.postType === 'POLL' ? 1 : null,
      pollIsAnonymous: false,
      ...(post.postType === 'POLL' && {
        pollOptions: {
          create: post.pollOptions.map((text, optionIndex) => ({
            text,
            position: optionIndex,
            votesCount: 0,
          })),
        },
      }),
      ...(post.postType === 'QUIZ' && {
        quiz: {
          create: {
            questions: quizQuestions(post.quizTopic),
            timeLimit: 8,
            passingScore: 70,
            totalPoints: 20,
            resultsVisibility: 'AFTER_SUBMISSION',
            shuffleQuestions: false,
            shuffleAnswers: false,
            maxAttempts: 3,
            showReview: true,
            showExplanations: true,
          },
        },
        quizQuestions: {
          create: quizQuestions(post.quizTopic).map((question, questionIndex) => ({
            ...question,
            position: questionIndex,
          })),
        },
      }),
    };

    const createdPost = await prisma.post.create({
      data: baseData,
      select: { id: true, title: true, postType: true },
    });

    await prisma.postScore.create({
      data: {
        postId: createdPost.id,
        engagementScore: 0,
        qualityScore: 86 + (index % 9),
        trendingScore: 0,
        decayFactor: 1,
        computedAt: new Date(),
      },
    });

    created.push(createdPost);
  }

  return created;
}

async function main() {
  console.log('Resetting feed test data and creating Khmer learning content...');
  console.log(`Official authors: ${officialEmails.join(', ')}`);

  const mediaBySlug = await generateAssets();
  const { users, school } = await upsertOfficialUsers();
  const deleted = await clearFeed();
  const created = await createLearningPosts(users, mediaBySlug, school?.id ?? null);

  const counts = created.reduce((acc, post) => {
    acc[post.postType] = (acc[post.postType] ?? 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({
    deleted,
    createdPosts: created.length,
    counts,
    school: school?.name ?? null,
    imageDir,
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
