/**
 * Seed: practice questions for all 18 Grade-9 Math units, containing a diverse
 * mix of 6 question types: Multiple Choice (MC), True/False (TF), Short Answer (SA),
 * Fill-in-the-Blank (FIB), Ordering, and Matching, all based on the official MoEYS
 * Grade 9 Math textbook.
 *
 * Safety: DRY-RUN by default (--apply to write). Idempotent: updates existing posts.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-practice-math-g9.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-practice-math-g9.ts --apply  # write
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { prepareQuizQuestions } from '../src/utils/quizQuestionRows';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const authorArg = process.argv.indexOf('--author');
const AUTHOR_OVERRIDE = authorArg >= 0 ? process.argv[authorArg + 1] : null;
const SUBJECT_CODE = 'MATH-G9';

type SeedQuestion = {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'ORDERING' | 'MATCHING';
  text: string;
  options?: string[];
  correctAnswer: any;
  explanation?: string;
};

/** 18 Units verified against MoEYS Grade 9 Math Textbook */
const PRACTICE: Record<string, SeedQuestion[]> = {
  'ចំនួនអសនិទាន': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើ $\\sqrt{49}$ ស្មើប៉ុន្មាន?',
      options: ['5', '6', '7', '8'],
      correctAnswer: 2,
      explanation: '$7 \\times 7 = 49$ ដូចនេះ $\\sqrt{49} = 7$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: '$\\sqrt{2}$ គឺជាចំនួនសនិទាន។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: '$\\sqrt{2} \\approx 1.414...$ ជាចំនួនអសនិទាន ព្រោះវាមិនអាចសរសេរជាទម្រង់ប្រភាគបានឡើយ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'គណនាតម្លៃនៃ $\\sqrt{16} + \\sqrt{9}$ ។',
      correctAnswer: '7',
      explanation: '$\\sqrt{16} = 4$ និង $\\sqrt{9} = 3$ ដូចនេះ $4 + 3 = 7$ ។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'संख्याដែលមិនអាចសរសេរជាទម្រង់ប្រភាគ $\\frac{a}{b}$ (ដែល $a, b$ ជាចំនួនគត់ ហើយ $b \\neq 0$) បានឡើយ ហៅថាចំនួន_______។',
      correctAnswer: 'អសនិទាន',
      explanation: 'តាមនិយមន័យ ចំនួនដែលមិនអាចសរសេរជាប្រភាគបាន ហៅថាចំនួនអសនិទាន។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំចំនួនខាងក្រោមតាមលំដាប់លំដោយពីតូចទៅធំ៖',
      options: ['\\sqrt{2}', '1.5', '\\sqrt{3}', '2'],
      correctAnswer: '',
      explanation: '$\\sqrt{2} \\approx 1.41$, $1.5$, $\\sqrt{3} \\approx 1.73$, $2$ តាមលំដាប់។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងចំនួនការេខាងឆ្វេង ទៅនឹងឫសការេរបស់វាខាងស្តាំ៖',
      options: [
        '\\sqrt{81}:::9',
        '\\sqrt{100}:::10',
        '\\sqrt{121}:::11',
        '\\sqrt{144}:::12',
      ],
      correctAnswer: JSON.stringify({
        '\\sqrt{81}': '9',
        '\\sqrt{100}': '10',
        '\\sqrt{121}': '11',
        '\\sqrt{144}': '12',
      }),
      explanation: 'ការគណនាឫសការេធម្មតា៖ $9^2=81$, $10^2=100$, $11^2=121$, $12^2=144$។',
    },
  ],
  'សមាមាត្រ': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'បើ $\\frac{a}{b} = \\frac{c}{d}$ តើទំនាក់ទំនងផលគុណឆ្លងណាត្រឹមត្រូវ?',
      options: ['a + d = b + c', 'a \\times d = b \\times c', 'a \\times b = c \\times d', 'a - b = c - d'],
      correctAnswer: 1,
      explanation: 'តាមលក្ខណៈសមាមាត្រ ផលគុណឆ្លងគឺ $a \\times d = b \\times c$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បើ $\\frac{x}{4} = \\frac{9}{12}$ នាំឱ្យ $x = 3$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: '$12x = 36 \\implies x = 3$ ពិតប្រាកដមែន។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'អាងមួយអាចចំណុះទឹក $7650\\text{ dm}^3$។ បើគេបញ្ចូលទឹកក្នុងល្បឿន $85\\text{ dm}^3$ ក្នុងរយៈពេល $2$ នាទី តើគេត្រូវប្រើពេលប៉ុន្មាននាទីទើបបញ្ចូលទឹកពេញអាង?',
      correctAnswer: '180',
      explanation: 'ល្បឿនបញ្ចូលទឹកគឺ $85/2 = 42.5\\text{ dm}^3/\\text{min}$។ ពេលវេលាត្រូវប្រើគឺ $7650 / 42.5 = 180$ នាទី។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ផលធៀបរវាងពីរតម្លៃដែលមានឯកតាខុសគ្នា ហៅថា_______។',
      correctAnswer: 'អត្រា',
      explanation: 'អត្រា (Rate) គឺជាផលធៀបរវាងពីរតម្លៃដែលមានឯកតាខុសគ្នា (ឧទាហរណ៍៖ ល្បឿន គីឡូម៉ែត្រ/ម៉ោង)។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំភាគរយខាងក្រោមតាមលំដាប់ពីតូចទៅធំ៖',
      options: ['10%', '25%', '50%', '75%'],
      correctAnswer: '',
      explanation: 'លំដាប់ធម្មតាគឺ 10%, 25%, 50%, 75%។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងផលធៀបខាងឆ្វេង ទៅនឹងភាគរយត្រូវគ្នាខាងស្តាំ៖',
      options: [
        '1/4:::25%',
        '1/2:::50%',
        '3/4:::75%',
        '1/5:::20%',
      ],
      correctAnswer: JSON.stringify({
        '1/4': '25%',
        '1/2': '50%',
        '3/4': '75%',
        '1/5': '20%',
      }),
      explanation: 'ប្តូរប្រភាគជាភាគរយដោយគុណនឹង ១០០%។',
    },
  ],
  'កន្សោមពីជគណិត': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ពន្លាតកន្សោម $(x + 2)(x - 3)$ ។',
      options: ['x^2 - x - 6', 'x^2 + x - 6', 'x^2 - 5x - 6', 'x^2 - x + 6'],
      correctAnswer: 0,
      explanation: '$(x+2)(x-3) = x^2 - 3x + 2x - 6 = x^2 - x - 6$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'កន្សោម $x^2 - 9$ អាចសរសេរជាផលគុណកត្តាបានជា $(x - 3)(x - 3)$។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'តាមរូបមន្តផលដកការេ $a^2-b^2 = (a-b)(a+b)$ នាំឱ្យ $x^2-9 = (x-3)(x+3)$។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកដឺក្រេនៃពហុធា $5x^4 - 2x^3 + 7x - 1$ ។',
      correctAnswer: '4',
      explanation: 'ដឺក្រេនៃពហុធាគឺជាស្វ័យគុណខ្ពស់បំផុតរបស់អថេរ $x$ ដែលក្នុងករណីនេះគឺ 4។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'កត្តារួមធំបំផុតនៃកន្សោម $6x^2 + 9x$ គឺ_______។',
      correctAnswer: '3x',
      explanation: '$6x^2 + 9x = 3x(2x + 3)$ ដូចនេះកត្តារួមគឺ $3x$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំដឺក្រេនៃពហុធាខាងក្រោមតាមលំដាប់ពីទាបទៅខ្ពស់៖',
      options: ['3x - 1', 'x^2 + 5', '2x^3 - x', 'x^4'],
      correctAnswer: '',
      explanation: 'ដឺក្រេនៃពហុធាគឺ ១, ២, ៣, ៤ តាមលំដាប់។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងកន្សោមការេខាងឆ្វេង ទៅនឹងផលគុណកត្តារបស់វាខាងស្តាំ៖',
      options: [
        'x^2-4:::(x-2)(x+2)',
        'x^2-4x+4:::(x-2)^2',
        'x^2+4x+4:::(x+2)^2',
        'x^2-1:::(x-1)(x+1)',
      ],
      correctAnswer: JSON.stringify({
        'x^2-4': '(x-2)(x+2)',
        'x^2-4x+4': '(x-2)^2',
        'x^2+4x+4': '(x+2)^2',
        'x^2-1': '(x-1)(x+1)',
      }),
      explanation: 'សម្រួលដោយប្រើរូបមន្តអត្តសញ្ញាណភាពគណិតវិទ្យា។',
    },
  ],
  'សមីការដឺក្រេទី១មានមួយអញ្ញាត': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ដោះស្រាយសមីការ៖ $2x + 3 = 11$ ។',
      options: ['x = 3', 'x = 4', 'x = 5', 'x = 7'],
      correctAnswer: 1,
      explanation: '$2x = 11 - 3 \\implies 2x = 8 \\implies x = 4$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ចម្លើយនៃសមីការ $3(x - 2) = 9$ គឺ $x = 5$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: '$x-2 = 3 \\implies x = 5$ ពិតប្រាកដមែន។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកតម្លៃ $x$ នៃសមីការ $5x - 7 = 3x + 5$ ។',
      correctAnswer: '6',
      explanation: '$5x - 3x = 5 + 7 \\implies 2x = 12 \\implies x = 6$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'បើ $x + y = 10$ ហើយ $x = y$ នោះ $x$ ស្មើ_______។',
      correctAnswer: '5',
      explanation: '$x + x = 10 \\implies 2x = 10 \\implies x = 5$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំជំហានដោះស្រាយសមីការ $2x - 5 = 7$ តាមលំដាប់លំដោយគណិតវិទ្យាត្រឹមត្រូវ៖',
      options: ['2x - 5 = 7', '2x = 7 + 5', '2x = 12', 'x = 6'],
      correctAnswer: '',
      explanation: 'សរសេរសមីការដំបូង បោះលេខទៅម្ខាង សម្រួលផលបូក រួចចែកនឹងមេគុណ។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងសមីការខាងឆ្វេង ទៅនឹងចម្លើយត្រូវគ្នាខាងស្តាំ៖',
      options: [
        '2x = 10:::x = 5',
        '3x = 12:::x = 4',
        'x/2 = 6:::x = 12',
        '5x = 0:::x = 0',
      ],
      correctAnswer: JSON.stringify({
        '2x = 10': 'x = 5',
        '3x = 12': 'x = 4',
        'x/2 = 6': 'x = 12',
        '5x = 0': 'x = 0',
      }),
      explanation: 'គណនាតម្លៃ x នីមួយៗ។',
    },
  ],
  'វិសមីការដឺក្រេទី១មានមួយអញ្ញាត': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ដោះស្រាយវិសមីការ៖ $2x - 1 < 5$ ។',
      options: ['x < 2', 'x < 3', 'x > 3', 'x < 6'],
      correctAnswer: 1,
      explanation: '$2x < 6 \\implies x < 3$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'នៅពេលគុណ ឬចែកអង្គទាំងពីរនៃវិសមីការនឹងចំនួនអវិជ្ជមាន ទិសដៅនៃវិសមភាពមិនផ្លាស់ប្តូរឡើយ។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'ច្បាប់គន្លឹះ៖ គុណ/ចែកនឹងចំនួនអវិជ្ជមាន ត្រូវត្រឡប់ទិសដៅវិសមភាពជានិច្ច។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកចំនួនគត់វិជ្ជមានធំបំផុតដែលផ្ទៀងផ្ទាត់វិសមីការ $x + 4 < 7$ ។',
      correctAnswer: '2',
      explanation: '$x < 3$ ដូចនេះចំនួនគត់វិជ្ជមានធំបំផុតគឺ 2 (ព្រោះ 3 មិនរាប់បញ្ចូល)។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ចំពោះវិសមីការ $-3x \\le 9$ នាំឱ្យ $x \\ge$ _______។',
      correctAnswer: '-3',
      explanation: 'ចែកនឹង $-3$ នាំឱ្យត្រឡប់ទិសដៅទៅជា $x \\ge 9/(-3) \\implies x \\ge -3$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំចន្លោះចម្លើយខាងក្រោមតាមទំហំ (ពីតូចទៅធំ ផ្អែកលើតម្លៃចុងខាងស្តាំ)៖',
      options: ['x < -5', 'x < 0', 'x < 3', 'x < 10'],
      correctAnswer: '',
      explanation: 'លំដាប់ចុងខាងស្តាំគឺ -5, 0, 3, 10។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងវិសមីការខាងឆ្វេង ទៅនឹងសំណុំចម្លើយត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'x+1>3:::x>2',
        '2x<8:::x<4',
        '-x>2:::x<-2',
        'x-5>=0:::x>=5',
      ],
      correctAnswer: JSON.stringify({
        'x+1>3': 'x>2',
        '2x<8': 'x<4',
        '-x>2': 'x<-2',
        'x-5>=0': 'x>=5',
      }),
      explanation: 'ដោះស្រាយវិសមីការសាមញ្ញនីមួយៗ។',
    },
  ],
  'បំណែងចែកប្រេកង់': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើប្រេកង់ភាគរយគណនាតាមរូបមន្តណា?',
      options: [
        '(ប្រេកង់ / ១០០) * ១០០%',
        '(ប្រេកង់ / ប្រេកង់សរុប) * ១០០%',
        'ប្រេកង់ * ១០០%',
        'ប្រេកង់សរុប / ប្រេកង់',
      ],
      correctAnswer: 1,
      explanation: 'រូបមន្តប្រេកង់ភាគរយគឺ $f_{\\%} = \\frac{f}{N} \\times 100\\%$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ផលបូកនៃប្រេកង់ទាក់ទងទាំងអស់ គឺស្មើនឹង ១ ជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ព្រោះប្រេកង់ទាក់ទងនីមួយៗស្មើ $f/N$ នាំឱ្យផលបូករបស់វាស្មើ $\\sum f / N = N/N = 1$។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'បើប្រេកង់នៃថ្នាក់មួយគឺ ១៥ ហើយប្រេកង់សរុបគឺ ៥០ តើប្រេកង់ភាគរយស្មើប៉ុន្មាន? (សរសេរតែតួលេខ)',
      correctAnswer: '30',
      explanation: '$(15 / 50) \\times 100\\% = 30\\%$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ខ្សែខ្សែកោងតំណាងឱ្យបំណែងចែកប្រេកង់កើន ហៅថា_______។',
      correctAnswer: 'អូស៊ីវ',
      explanation: 'ខ្សែខ្សែកោងប្រេកង់កើនមានឈ្មោះបច្ចេកទេសថា អូស៊ីវ (Ogive)។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំជំហានគូរតារាងបំណែងចែកប្រេកង់ តាមលំដាប់លំដោយការងារត្រឹមត្រូវ៖',
      options: [
        'ប្រមូលទិន្នន័យឆៅ',
        'រកតម្លៃអតិបរមា និងអប្បបរមា',
        'កំណត់ចំនួនថ្នាក់ និងវិសាលភាពថ្នាក់',
        'រាប់ចំនួនទិន្នន័យក្នុងថ្នាក់នីមួយៗ (ប្រេកង់)',
      ],
      correctAnswer: '',
      explanation: 'ជំហានចាប់ផ្តើមពីប្រមូលទិន្នន័យ រៀបចំថ្នាក់ រួចទើបរាប់ប្រេកង់។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងពាក្យបច្ចេកទេសស្ថិតិខាងឆ្វេង ទៅនឹងពាក្យខ្មែរត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'Class Interval:::ចន្លោះថ្នាក់',
        'Frequency:::ប្រេកង់',
        'Relative Frequency:::ប្រេកង់ទាក់ទង',
        'Cumulative Frequency:::ប្រេកង់កើន',
      ],
      correctAnswer: JSON.stringify({
        'Class Interval': 'ចន្លោះថ្នាក់',
        'Frequency': 'ប្រេកង់',
        'Relative Frequency': 'ប្រេកង់ទាក់ទង',
        'Cumulative Frequency': 'ប្រេកង់កើន',
      }),
      explanation: 'ពាក្យបច្ចេកទេសក្នុងសៀវភៅ MoEYS។',
    },
  ],
  'ស្ថិតិ': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'គណនាមធ្យមភាគនៃសំណុំទិន្នន័យ៖ 4, 6, 8, 10 ។',
      options: ['6', '7', '8', '9'],
      correctAnswer: 1,
      explanation: '$\\text{Mean} = \\frac{4 + 6 + 8 + 10}{4} = \\frac{28}{4} = 7$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'មេដ្យាននៃសំណុំទិន្នន័យ 2, 8, 3, 7, 5 គឺ 3។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'រៀបទិន្នន័យសិន៖ 2, 3, 5, 7, 8 នាំឱ្យតម្លៃកណ្តាលគឺ 5 (មេដ្យាន)។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកម៉ូដនៃសំណុំទិន្នន័យ៖ 3, 5, 5, 7, 8, 9, 5, 3 ។',
      correctAnswer: '5',
      explanation: 'លេខ 5 មានប្រេកង់ច្រើនជាងគេ (៣ដង) ដូចនេះម៉ូដគឺ 5។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ផលដករវាងតម្លៃអតិបរមា និងតម្លៃអប្បបរមានៃទិន្នន័យ ហៅថា_______។',
      correctAnswer: 'វិសាលភាព',
      explanation: 'វិសាលភាព (Range) គណនាដោយយកតម្លៃធំបំផុត ដកតម្លៃតូចបំផុត។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំទិន្នន័យខាងក្រោមតាមលំដាប់ឡើង (ពីតូចទៅធំ) ដើម្បីរកមេដ្យាន៖',
      options: ['2', '5', '7', '9', '11'],
      correctAnswer: '',
      explanation: 'រៀបចំទិន្នន័យឡើង៖ 2, 5, 7, 9, 11។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងសំណុំទិន្នន័យខាងឆ្វេង ទៅនឹងតម្លៃមេដ្យានរបស់វាខាងស្តាំ៖',
      options: [
        '3, 5, 7:::5',
        '2, 4, 6, 8:::5',
        '1, 10, 100:::10',
        '1, 2, 3, 4, 5:::3',
      ],
      correctAnswer: JSON.stringify({
        '3, 5, 7': '5',
        '2, 4, 6, 8': '5',
        '1, 10, 100': '10',
        '1, 2, 3, 4, 5': '3',
      }),
      explanation: 'ការគណនាមេដ្យានសម្រាប់សំណុំទិន្នន័យនីមួយៗ។',
    },
  ],
  'ប្រូបាប': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ពេលបោះគ្រាប់ឡុកឡាក់មួយ តើប្រូបាបក្នុងការចេញលេខ ៥ ស្មើប៉ុន្មាន?',
      options: ['1/2', '1/6', '5/6', '1'],
      correctAnswer: 1,
      explanation: 'ករណីស្របគឺមានតែ ១ គីឡេខ ៥។ ករណីអាចសរុបគឺ ៦ (លេខ ១ ដល់ ៦)។ $P = 1/6$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ប្រូបាបនៃព្រឹត្តិការណ៍ច្បាស់លាស់មួយកើតឡើង (Sure Event) គឺស្មើនឹង ១ ជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ព្រឹត្តិការណ៍ពិតប្រាកដកើតឡើងមានប្រូបាបស្មើ 1 ហើយមិនអាចកើតឡើងសោះស្មើ 0។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងថង់មួយមានបាល់ក្រហម ៣ និងបាល់ខៀវ ២។ គេចាប់យកបាល់មួយដោយចៃដន្យ។ រកប្រូបាប៊ីលីតេជាភាគរយក្នុងការចាប់បានបាល់ខៀវ។ (សរសេរតែលេខ ឧ. 40)',
      correctAnswer: '40',
      explanation: '$P(\\text{blue}) = 2/5 = 0.4 = 40\\%$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ផលបូកប្រូបាបនៃព្រឹត្តិការណ៍ $A$ និងព្រឹត្តិការណ៍បំពេញ $A\'$ គឺស្មើនឹង_______។',
      correctAnswer: '1',
      explanation: '$P(A) + P(A\') = 1$ ជានិច្ច។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំប្រូបាបខាងក្រោមតាមលំដាប់លទ្ធភាពកើតឡើងពីទាបទៅខ្ពស់៖',
      options: ['P = 0', 'P = 0.25', 'P = 0.5', 'P = 1'],
      correctAnswer: '',
      explanation: 'ប្រូបាបចាប់ពី 0 (មិនអាចកើតមាន) ទៅដល់ 1 (កើតមានពិតប្រាកដ)។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងព្រឹត្តិការណ៍ខាងឆ្វេង ទៅនឹងតម្លៃប្រូបាបរបស់វាខាងស្តាំ៖',
      options: [
        'បោះកាក់ចេញក្បាល:::1/2',
        'បោះឡុកឡាក់ចេញលេខ៧:::0',
        '抓បានបាល់ក្រហមពីថង់មានតែបាល់ក្រហម:::1',
        'បោះឡុកឡាក់ចេញលេខសេស:::1/2',
      ],
      correctAnswer: JSON.stringify({
        'បោះកាក់ចេញក្បាល': '1/2',
        'បោះឡុកឡាក់ចេញលេខ៧': '0',
        '抓បានបាល់ក្រហមពីថង់មានតែបាល់ក្រហម': '1',
        'បោះឡុកឡាក់ចេញលេខសេស': '1/2',
      }),
      explanation: 'ការវិភាគប្រូបាបនៃករណីនីមួយៗ។',
    },
  ],
  'ចម្ងាយរវាងពីរចំណុច': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើរូបមន្តចម្ងាយរវាងពីរចំណុច $A(x_1, y_1)$ និង $B(x_2, y_2)$ លើប្លង់កូអរដោនេមួយណាត្រឹមត្រូវ?',
      options: [
        'AB = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}',
        'AB = (x_2-x_1) + (y_2-y_1)',
        'AB = \\sqrt{(x_2+x_1)^2 + (y_2+y_1)^2}',
        'AB = \\sqrt{(x_2-x_1)^2 - (y_2-y_1)^2}',
      ],
      correctAnswer: 0,
      explanation: 'រូបមន្តចម្ងាយសម្រាយចេញពីទ្រឹស្ដីបទពីតាករលើប្លង់កូអរដោនេ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'កូអរដោនេចំណុចកណ្តាល $M$ នៃកាត់ $AB$ ដែល $A(2, 4)$ និង $B(6, 8)$ គឺ $M(4, 6)$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: '$M(\\frac{2+6}{2}, \\frac{4+8}{2}) = M(4, 6)$ ពិតប្រាកដមែន។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'គណនាចម្ងាយរវាងចំណុច $A(1, 2)$ និង $B(4, 6)$ ។',
      correctAnswer: '5',
      explanation: '$d = \\sqrt{(4-1)^2 + (6-2)^2} = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'បើចំណុច $A(0,0)$ និង $B(0,6)$ នោះចម្ងាយ $AB$ គឺស្មើ_______។',
      correctAnswer: '6',
      explanation: 'ចម្ងាយលើអ័ក្សឈរ៖ $|y_2 - y_1| = |6 - 0| = 6$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំចំណុចខាងក្រោមតាមលំដាប់ចម្ងាយពីគល់តម្រុយ $O(0,0)$ ពីជិតទៅឆ្ងាយ៖',
      options: ['A(1,1)', 'B(2,2)', 'C(3,3)', 'D(4,4)'],
      correctAnswer: '',
      explanation: 'ចម្ងាយកើនឡើងជាបន្តបន្ទាប់ពី A ទៅ D។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងគូចំណុចខាងឆ្វេង ទៅនឹងចម្ងាយរវាងចំណុចទាំងពីរខាងស្តាំ៖',
      options: [
        '(0,0) និង (3,4):::5',
        '(1,1) និង (1,5):::4',
        '(2,3) និង (5,3):::3',
        '(0,0) និង (6,8):::10',
      ],
      correctAnswer: JSON.stringify({
        '(0,0) និង (3,4)': '5',
        '(1,1) និង (1,5)': '4',
        '(2,3) និង (5,3)': '3',
        '(0,0) និង (6,8)': '10',
      }),
      explanation: 'គណនាដោយប្រើរូបមន្តចម្ងាយរវាងពីរចំណុច។',
    },
  ],
  'សមីការនៃបន្ទាត់': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'រកមេគុណប្រាប់ទិសនៃបន្ទាត់ដែលមានសមីការ៖ $y = -2x + 5$ ។',
      options: ['-2', '2', '5', '-5'],
      correctAnswer: 0,
      explanation: 'តាមទម្រង់ទូទៅ $y = ax + b$ មេគុណប្រាប់ទិសគឺ $a = -2$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បន្ទាត់ $y = 3x - 1$ កាត់អ័ក្សអ័រដោនេ (y) ត្រង់ចំណុច $(0, -1)$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ជំនួស $x=0$ នាំឱ្យ $y = 3(0) - 1 = -1$ ដូចនេះចំណុចកាត់គឺ $(0, -1)$។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកមេគុណប្រាប់ទិសនៃបន្ទាត់ដែលឆ្លងកាត់ចំណុច $(0, 0)$ និង $(3, 6)$ ។',
      correctAnswer: '2',
      explanation: '$a = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{6 - 0}{3 - 0} = 2$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'បន្ទាត់ពីរស្របគ្នា លុះត្រាតែមេគុណប្រាប់ទិសរបស់វា_______។',
      correctAnswer: 'ស្មើគ្នា',
      explanation: 'លក្ខខណ្ឌស្របគ្នានៃបន្ទាត់ពីរ៖ $a = a\'$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំបន្ទាត់ខាងក្រោមតាមលំដាប់លំដោយមេគុណប្រាប់ទិសរបស់វាពីតូចទៅធំ៖',
      options: ['y = -3x', 'y = -x', 'y = x', 'y = 2x'],
      correctAnswer: '',
      explanation: 'មេគុណប្រាប់ទិសរៀងគ្នាគឺ -3, -1, 1, 2។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងបន្ទាត់ខាងឆ្វេង ទៅនឹងចំណុចកាត់អ័ក្ស y របស់វាខាងស្តាំ៖',
      options: [
        'y = 2x+3:::(0,3)',
        'y = x-5:::(0,-5)',
        'y = -x:::(0,0)',
        'y = 3x+1:::(0,1)',
      ],
      correctAnswer: JSON.stringify({
        'y = 2x+3': '(0,3)',
        'y = x-5': '(0,-5)',
        'y = -x': '(0,0)',
        'y = 3x+1': '(0,1)',
      }),
      explanation: 'ចំណុចកាត់អ័ក្ស y សម្រេចដោយតម្លៃ $b$ ក្នុងសមីការ $y = ax + b$។',
    },
  ],
  'ប្រព័ន្ធសមីការដឺក្រេទី១មានពីរអញ្ញាត': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ដោះស្រាយប្រព័ន្ធសមីការ៖ $x + y = 5$ និង $x - y = 1$ ។',
      options: ['(3, 2)', '(2, 3)', '(4, 1)', '(1, 4)'],
      correctAnswer: 0,
      explanation: 'បូកសមីការទាំងពីរ៖ $2x = 6 \\implies x = 3$។ ជំនួសចូលសមីការទីមួយ៖ $3 + y = 5 \\implies y = 2$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'គូ $(2, 3)$ ជាចម្លើយនៃប្រព័ន្ធសមីការ $2x + y = 7$ និង $y = x + 1$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ផ្ទៀងផ្ទាត់៖ $2(2) + 3 = 7$ (ពិត) និង $3 = 2 + 1$ (ពិត)។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងប្រព័ន្ធសមីការ $x + 2y = 8$ ប្រសិនបើ $x = 2$ តើ $y$ ស្មើប៉ុន្មាន?',
      correctAnswer: '3',
      explanation: 'ជំនួស $x=2$ នាំឱ្យ $2 + 2y = 8 \\implies 2y = 6 \\implies y = 3$ Gennifer។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'បើ $x + y = 10$ ហើយ $x = y$ នោះតម្លៃ $x$ គឺស្មើ_______។',
      correctAnswer: '5',
      explanation: '$x + x = 10 \\implies 2x = 10 \\implies x = 5$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំជំហានដោះស្រាយប្រព័ន្ធសមីការតាមវិធីជំនួស តាមលំដាប់លំដោយត្រឹមត្រូវ៖',
      options: [
        'ទាញរកអញ្ញាតមួយពីសមីការទី១',
        'យកតម្លៃដែលទាញបានទៅជំនួសក្នុងសមីការទី២',
        'ដោះស្រាយសមីការដឺក្រេទី១មានមួយអញ្ញាតដែលទើបបង្កើតបាន',
        'យកតម្លៃអញ្ញាតទី១ដែលរកឃើញទៅជំនួសដើម្បីរកអញ្ញាតទី២',
      ],
      correctAnswer: '',
      explanation: 'លំដាប់លំដោយត្រឹមត្រូវនៃវិធីដោះស្រាយតាមការជំនួស។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងប្រព័ន្ធសមីការខាងឆ្វេង ទៅនឹងចម្លើយគូ $(x, y)$ របស់វាខាងស្តាំ៖',
      options: [
        'x+y=3, x-y=1:::(2,1)',
        'x+y=4, x-y=0:::(2,2)',
        '2x+y=5, x-y=1:::(2,1)',
        'x+y=6, x-y=4:::(5,1)',
      ],
      correctAnswer: JSON.stringify({
        'x+y=3, x-y=1': '(2,1)',
        'x+y=4, x-y=0': '(2,2)',
        '2x+y=5, x-y=1': '(2,1)',
        'x+y=6, x-y=4': '(5,1)',
      }),
      explanation: 'ផ្ទៀងផ្ទាត់ដោយជំនួសចម្លើយចូលប្រព័ន្ធសមីការ។',
    },
  ],
  'ទ្រឹស្ដីបទពីតាករ': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងត្រីកោណកែងដែលមានប្រវែងជ្រុងកែង ៣ និង ៤ តើប្រវែងអ៊ីប៉ូតេនុសស្មើប៉ុន្មាន?',
      options: ['5', '6', '7', '12'],
      correctAnswer: 0,
      explanation: 'តាមពីតាករ៖ $c^2 = 3^2 + 4^2 = 9 + 16 = 25 \\implies c = \\sqrt{25} = 5$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ត្រីកោណដែលមានប្រវែងជ្រុង ៥, ១២, និង ១៣ ជាត្រីកោណកែង។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: '$5^2 + 12^2 = 25 + 144 = 169 = 13^2$ (ផ្ទៀងផ្ទាត់តាមទ្រឹស្ដីបទច្រាសពីតាករ)។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងត្រីកោណកែងមួយ អ៊ីប៉ូតេនុសស្មើ ១០ និងជ្រុងកែងមួយស្មើ ៦។ រកប្រវែងជ្រុងកែងមួយទៀត។',
      correctAnswer: '8',
      explanation: '$b = \\sqrt{10^2 - 6^2} = \\sqrt{100 - 36} = \\sqrt{64} = 8$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ក្នុងត្រីកោណកែង $ABC$ កែងត្រង់ $A$ ប្រសិនបើ $AB=6$ និង $AC=8$ នោះប្រវែង $BC$ ស្មើ_______។',
      correctAnswer: '10',
      explanation: '$BC = \\sqrt{AB^2 + AC^2} = \\sqrt{36 + 64} = 10$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំជ្រុងត្រីកោណកែង (អ៊ីប៉ូតេនុស) ពីតូចទៅធំ ផ្អែកលើជ្រុងជាប់មុំកែង៖',
      options: [
        'ជ្រុងកែង 3, 4 (អ៊ីប៉ូតេនុស 5)',
        'ជ្រុងកែង 5, 12 (អ៊ីប៉ូតេនុស 13)',
        'ជ្រុងកែង 9, 12 (អ៊ីប៉ូតេនុស 15)',
        'ជ្រុងកែង 8, 15 (អ៊ីប៉ូតេនុស 17)',
      ],
      correctAnswer: '',
      explanation: 'អ៊ីប៉ូតេនុសគណនាបានរៀងគ្នាគឺ 5, 13, 15, 17។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងគូជ្រុងជាប់មុំកែងខាងឆ្វេង ទៅនឹងប្រវែងអ៊ីប៉ូតេនុសខាងស្តាំ៖',
      options: [
        '3, 4:::5',
        '6, 8:::10',
        '5, 12:::13',
        '9, 12:::15',
      ],
      correctAnswer: JSON.stringify({
        '3, 4': '5',
        '6, 8': '10',
        '5, 12': '13',
        '9, 12': '15',
      }),
      explanation: 'គណនាដោយប្រើទ្រឹស្ដីបទពីតាករ។',
    },
  ],
  'រង្វង់និងបន្ទាត់': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'បើកាំរង្វង់ $r = 7$ តើបរិមាត្ររង្វង់ស្មើប៉ុន្មាន?',
      options: ['7\\pi', '14\\pi', '49\\pi', '21\\pi'],
      correctAnswer: 1,
      explanation: '$C = 2\\pi r = 2\\pi(7) = 14\\pi$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បន្ទាត់ប៉ះរង្វង់កែងនឹងកាំត្រង់ចំណុចប៉ះ។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'នេះជាលក្ខណៈគ្រឹះដ៏សំខាន់របស់បន្ទាត់ប៉ះ និងរង្វង់។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'បើក្រឡាផ្ទៃថាសស្មើ $25\\pi$ តើកាំរង្វង់ស្មើប៉ុន្មាន?',
      correctAnswer: '5',
      explanation: '$A = \\pi r^2 = 25\\pi \\implies r^2 = 25 \\implies r = 5$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'បើអង្កត់ផ្ចិតរង្វង់ស្មើ ១០ នោះកាំរង្វង់ស្មើ_______។',
      correctAnswer: '5',
      explanation: '$r = d/2 = 10/2 = 5$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំប្រវែងកាំរង្វង់ពីតូចទៅធំ ផ្អែកលើបរិមាត្ររង្វង់ដែលបានផ្តល់ឱ្យ៖',
      options: ['C = 2\\pi', 'C = 4\\pi', 'C = 6\\pi', 'C = 8\\pi'],
      correctAnswer: '',
      explanation: 'កាំរង្វង់រៀងគ្នាគឺ ១, ២, ៣, ៤ ផ្អែកលើរូបមន្ត $C = 2\\pi r$។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងប្រវែងកាំខាងឆ្វេង ទៅនឹងក្រឡាផ្ទៃថាសត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'r = 1:::\\pi',
        'r = 2:::4\\pi',
        'r = 3:::9\\pi',
        'r = 5:::25\\pi',
      ],
      correctAnswer: JSON.stringify({
        'r = 1': '\\pi',
        'r = 2': '4\\pi',
        'r = 3': '9\\pi',
        'r = 5': '25\\pi',
      }),
      explanation: 'ក្រឡាផ្ទៃគណនាតามរូបមន្ត $A = \\pi r^2$។',
    },
  ],
  'មុំកណ្តាលនិងមុំចារឹកក្នុងរង្វង់': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'បើមុំកណ្តាលស្មើ $80^\\circ$ តើមុំចារឹកដែលស្កាត់ធ្នូជាមួយគ្នាមានរង្វាស់ប៉ុន្មានដឺក្រេ?',
      options: ['40^\\circ', '80^\\circ', '160^\\circ', '20^\\circ'],
      correctAnswer: 0,
      explanation: 'រង្វាស់មុំចារឹកស្មើនឹងពាក់កណ្តាលមុំកណ្តាលដែលស្កាត់ធ្នូរួមគ្នា។ $80^\\circ / 2 = 40^\\circ$ Gennifer។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'មុំចារឹកក្នុងរង្វង់ដែលស្កាត់កន្លះរង្វង់ គឺជាមុំកែង។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ព្រោះវាស្កាត់ធ្នូដែលមានរង្វាស់ $180^\\circ$ នាំឱ្យមុំចារឹកស្មើ $180^\\circ / 2 = 90^\\circ$ (មុំកែង)។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងចតុកោណចារឹកក្នុងរង្វង់ $ABCD$ បើមុំ $A = 70^\\circ$ តើមុំទល់មុខ $C$ ស្មើប៉ុន្មានដឺក្រេ? (សរសេរតែតួលេខ)',
      correctAnswer: '110',
      explanation: 'ផលបូកមុំទល់មុខនៃចតុកោណចារឹកក្នុងរង្វង់គឺ $180^\\circ$ នាំឱ្យ $C = 180^\\circ - 70^\\circ = 110^\\circ$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'មុំចារឹកពីរដែលស្កាត់ធ្នូតែមួយ មានរង្វាស់_______។',
      correctAnswer: 'ស្មើគ្នា',
      explanation: 'លក្ខណៈមុំចារឹក៖ មុំចារឹកស្កាត់ធ្នូតែមួយ មានរង្វាស់ស្មើគ្នា។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំមុំខាងក្រោមពីតូចទៅធំ ផ្អែកលើធ្នូស្កាត់ $AB = 60^\\circ$៖',
      options: [
        'មុំចារឹក ∠ACB (30°)',
        'មុំកណ្តាល ∠AOB (60°)',
        'មុំចារឹកស្កាត់កន្លះរង្វង់ (90°)',
      ],
      correctAnswer: '',
      explanation: 'រង្វាស់មុំរៀងគ្នាគឺ 30°, 60°, 90°។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងរង្វាស់មុំកណ្តាលខាងឆ្វេង ទៅនឹងរង្វាស់មុំចារឹកស្កាត់ធ្នូរួមគ្នាខាងស្តាំ៖',
      options: [
        '60^\\circ:::30^\\circ',
        '80^\\circ:::40^\\circ',
        '100^\\circ:::50^\\circ',
        '120^\\circ:::60^\\circ',
      ],
      correctAnswer: JSON.stringify({
        '60^\\circ': '30^\\circ',
        '80^\\circ': '40^\\circ',
        '100^\\circ': '50^\\circ',
        '120^\\circ': '60^\\circ',
      }),
      explanation: 'មុំចារឹក = មុំកណ្តាល / 2។',
    },
  ],
  'ទ្រឹស្ដីបទថាឡែស': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងត្រីកោណ $ABC$ បើបន្ទាត់ $DE // BC$ ($D$ លើ $AB$, $E$ លើ $AC$) តើសមាមាត្រថាឡែសណាត្រឹមត្រូវ?',
      options: ['AD/DB = AE/EC', 'AD/AB = AE/AC', 'DB/AB = EC/AC', 'AB/AD = AC/AE'],
      correctAnswer: 0,
      explanation: 'ទ្រឹស្ដីបទថាឡែសក្នុងត្រីកោណចែងថា $\\frac{AD}{DB} = \\frac{AE}{EC}$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បើបន្ទាត់ស្របបីកាត់ខ្សែកាត់ពីរ វាកំណត់បានអង្កត់សមាមាត្រគ្នានៅលើខ្សែកាត់ទាំងនោះ។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'នេះជាទ្រឹស្ដីបទថាឡែសទូទៅសម្រាប់បន្ទាត់ស្រប។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងត្រីកោណ $ABC$ មាន $DE // BC$។ បើ $AD = 2$, $DB = 4$ និង $AE = 3$ គណនាប្រវែង $EC$។',
      correctAnswer: '6',
      explanation: 'តាមថាឡែស៖ $\\frac{AD}{DB} = \\frac{AE}{EC} \\implies \\frac{2}{4} = \\frac{3}{EC} \\implies EC = 6$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ក្នុងត្រីកោណ $ABC$ មាន $D$ និង $E$ ជាចំណុចកណ្តាល $AB$ និង $AC$។ ប្រសិនបើ $BC = 10$ នោះប្រវែង $DE$ ស្មើ_______។',
      correctAnswer: '5',
      explanation: 'តាមលក្ខណៈខ្សែមធ្យមត្រីកោណ៖ $DE = BC / 2 = 10 / 2 = 5$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំប្រវែងអង្កត់ $DE$ (ដែល $D, E$ ជាចំណុចកណ្តាល $AB, AC$) ពីតូចទៅធំ ផ្អែកលើតម្លៃ $BC$ ៖',
      options: [
        'BC = 4 (DE = 2)',
        'BC = 6 (DE = 3)',
        'BC = 8 (DE = 4)',
        'BC = 10 (DE = 5)',
      ],
      correctAnswer: '',
      explanation: 'ប្រវែងខ្សែមធ្យមស្មើពាក់កណ្តាលជ្រុងបាតរៀងគ្នាគឺ 2, 3, 4, 5។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងសមាមាត្រថាឡែសខាងឆ្វេង ទៅនឹងសមាមាត្រត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'AD/DB:::AE/EC',
        'AD/AB:::AE/AC',
        'DB/AB:::EC/AC',
        'AB/AD:::AC/AE',
      ],
      correctAnswer: JSON.stringify({
        'AD/DB': 'AE/EC',
        'AD/AB': 'AE/AC',
        'DB/AB': 'EC/AC',
        'AB/AD': 'AC/AE',
      }),
      explanation: 'ទម្រង់បម្រែបម្រួលផ្សេងៗគ្នានៃទ្រឹស្ដីបទថាឡែស។',
    },
  ],
  'ត្រីកោណដូចគ្នា': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ត្រីកោណពីរដូចគ្នា កាលណាមុំរៀងគ្នាស្មើគ្នា ហើយជ្រុងត្រូវគ្នា៖',
      options: ['ស្មើគ្នាទាំងអស់', 'มีសមាមាត្រដូចគ្នា', 'ស្របគ្នា', 'កែងគ្នា'],
      correctAnswer: 1,
      explanation: 'ត្រីកោណដូចគ្នាមានជ្រុងត្រូវគ្នាជាជ្រុងសមាមាត្រ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បើត្រីកោណពីរដូចគ្នាមានផលធៀបដូចគ្នា $k = 3$ នោះផលធៀបក្រឡាផ្ទៃរបស់វាស្មើនឹង $9$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ផលធៀបក្រឡាផ្ទៃនៃត្រីកោណដូចគ្នាគឺស្មើ $k^2$ ដូចនេះ $3^2 = 9$ ពិតប្រាកដមែន។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ដើមឈើមួយបោះស្រមោលប្រវែង ១២ ម៉ែត្រ ក្នុងពេលដែលបង្គោលកម្ពស់ ២ ម៉ែត្រ បោះស្រមោលប្រវែង ៣ ម៉ែត្រ។ រកកម្ពស់ដើមឈើគិតជាម៉ែត្រ។',
      correctAnswer: '8',
      explanation: 'តាមលក្ខណៈត្រីកោណដូចគ្នា៖ $\\frac{\\text{height}}{12} = \\frac{2}{3} \\implies \\text{height} = \\frac{12 \\times 2}{3} = 8$ ម៉ែត្រ។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ក្នុងត្រីកោណកែង $ABC$ (កែងត្រង់ $A$) មានកម្ពស់ $AH$។ ទំនាក់ទំនងម៉ែត្រិកគឺ $AH^2 = BH \\times $_______។',
      correctAnswer: 'CH',
      explanation: 'ការេនៃកម្ពស់ស្មើនឹងផលគុណនៃអង្កត់ស្រមោលទាំងពីរលើអ៊ីប៉ូតេនុស។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំផលធៀបក្រឡាផ្ទៃ $S/S\'$ ពីតូចទៅធំ ផ្អែកលើផលធៀបដូចគ្នា $k$ ៖',
      options: [
        'k = 1 (S/S\' = 1)',
        'k = 2 (S/S\' = 4)',
        'k = 3 (S/S\' = 9)',
        'k = 4 (S/S\' = 16)',
      ],
      correctAnswer: '',
      explanation: 'ផលធៀបក្រឡាផ្ទៃគឺ $k^2$ នាំឱ្យតម្លៃរៀងគ្នាគឺ 1, 4, 9, 16។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងផលធៀបដូចគ្នា $k$ ខាងឆ្វេង ទៅនឹងផលធៀបក្រឡាផ្ទៃត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'k = 2:::4',
        'k = 3:::9',
        'k = 4:::16',
        'k = 5:::25',
      ],
      correctAnswer: JSON.stringify({
        'k = 2': '4',
        'k = 3': '9',
        'k = 4': '16',
        'k = 5': '25',
      }),
      explanation: 'ផលធៀបក្រឡាផ្ទៃស្មើការេនៃផលធៀបដូចគ្នា ($k^2$)។',
    },
  ],
  'ពហុកោណ': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'រកផលបូកមុំក្នុងនៃបញ្ចកោណ (៥ ជ្រុង)។',
      options: ['180^\\circ', '360^\\circ', '540^\\circ', '720^\\circ'],
      correctAnswer: 2,
      explanation: 'ផលបូកមុំក្នុងពហុកោណ $n$ ជ្រុងគឺ $(n-2) \\times 180^\\circ$។ សម្រាប់ $n=5$៖ $(5-2) \\times 180^\\circ = 540^\\circ$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ផលបូកមុំក្រៅនៃពហុកោណប៉ោងណាមួយ គឺស្មើនឹង $360^\\circ$ ជានិច្ច មិនថាពហុកោណនោះមានប៉ុន្មានជ្រុងឡើយ។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'នេះជាលក្ខណៈទូទៅនៃមុំក្រៅរបស់ពហុកោណប៉ោង។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកចំនួនអង្កត់ទ្រូងនៃបញ្ចកោណ (៥ ជ្រុង)។',
      correctAnswer: '5',
      explanation: 'ចំនួនអង្កត់ទ្រូងគណនាតាមរូបមន្ត៖ $\\frac{n(n-3)}{2}$។ សម្រាប់ $n=5$៖ $\\frac{5(5-3)}{2} = \\frac{10}{2} = 5$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'មុំក្រៅនីមួយៗនៃឆកោណនិយ័ត (៦ ជ្រុង) មានរង្វាស់ស្មើនឹង_______ដឺក្រេ។ (សរសេរតែតួលេខ)',
      correctAnswer: '60',
      explanation: 'មុំក្រៅនីមួយៗនៃពហុកោណនិយ័តគឺ $360^\\circ / n$។ សម្រាប់ $n=6$៖ $360^\\circ / 6 = 60^\\circ$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំពហុកោណខាងក្រោមតាមផលបូកមុំក្នុងរបស់វាពីតូចទៅធំ៖',
      options: [
        'ត្រីកោណ (180°)',
        'ចតុកោណ (360°)',
        'បញ្ចកោណ (540°)',
        'ឆកោណ (720°)',
      ],
      correctAnswer: '',
      explanation: 'ផលបូកមុំក្នុងកើនឡើងតាមចំនួនជ្រុង។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងចំនួនជ្រុងពហុកោណខាងឆ្វេង ទៅនឹងផលបូកមុំក្នុងរបស់វាខាងស្តាំ៖',
      options: [
        '3:::180^\\circ',
        '4:::360^\\circ',
        '5:::540^\\circ',
        '6:::720^\\circ',
      ],
      correctAnswer: JSON.stringify({
        '3': '180^\\circ',
        '4': '360^\\circ',
        '5': '540^\\circ',
        '6': '720^\\circ',
      }),
      explanation: 'គណនាតាមរូបមន្ត $(n-2) \\times 180^\\circ$។',
    },
  ],
  'សូលីត': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'គណនាមាឌរបស់គូបដែលមានប្រវែងជ្រុង $a = 3$ ។',
      options: ['9', '18', '27', '81'],
      correctAnswer: 2,
      explanation: '$V = a^3 = 3^3 = 27$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'មាឌរបស់ស៊ីឡាំងដែលមានកាំបាត $r$ និងកម្ពស់ $h$ គឺ $V = \\pi r^2 h$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'រូបមន្តមាឌស៊ីឡាំងគឺ ផ្ទៃបាត $\\times$ កម្ពស់ = $\\pi r^2 h$។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកមាឌប្រអប់ (ប្រលេពីប៉ែតកែង) ដែលមានវិមាត្រប្រវែង ២, ៣, និង ៤។',
      correctAnswer: '24',
      explanation: '$V = l \\times w \\times h = 2 \\times 3 \\times 4 = 24$។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'កោណមានកាំបាត $r=3$ និងកម្ពស់ $h=4$ មានមាឌស្មើនឹង_______$\\pi$។ (សរសេរតែតួលេខ)',
      correctAnswer: '12',
      explanation: '$V = \\frac{1}{3} \\pi r^2 h = \\frac{1}{3} \\pi (3^2) (4) = 12\\pi$។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំមាឌរបស់គូបពីតូចទៅធំ ផ្អែកលើប្រវែងជ្រុងរបស់វា៖',
      options: [
        'ជ្រុង a = 1 (V = 1)',
        'ជ្រុង a = 2 (V = 8)',
        'ជ្រុង a = 3 (V = 27)',
        'ជ្រុង a = 4 (V = 64)',
      ],
      correctAnswer: '',
      explanation: 'មាឌគូបរៀងគ្នាគឺ ១, ៨, ២៧, ៦៤។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងរូបរាងសូលីតខាងឆ្វេង ទៅនឹងរូបមន្តមាឌរបស់វាត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'គូប:::V = a^3',
        'ប្រអប់:::V = lwh',
        'ស៊ីឡាំង:::V = \\pi r^2 h',
        'កោណ:::V = (1/3)\\pi r^2 h',
      ],
      correctAnswer: JSON.stringify({
        'គូប': 'V = a^3',
        'ប្រអប់': 'V = lwh',
        'ស៊ីឡាំង': 'V = \\pi r^2 h',
        'កោណ': 'V = (1/3)\\pi r^2 h',
      }),
      explanation: 'រូបមន្តមាឌមូលដ្ឋានរបស់សូលីតនីមួយៗ។',
    },
  ],
};

const OLD_NAMES: Record<string, string[]> = {
  'ចំនួនអសនិទាន': ['Real Numbers'],
  'សមាមាត្រ': ['Proportion'],
  'កន្សោមពីជគណិត': ['Polynomials & Algebraic Expressions'],
  'សមីការដឺក្រេទី១មានមួយអញ្ញាត': ['Linear Equations'],
  'វិសមីការដឺក្រេទី១មានមួយអញ្ញាត': ['Linear Inequalities'],
  'បំណែងចែកប្រេកង់': ['Frequency Distribution'],
  'ស្ថិតិ': ['Statistics'],
  'ប្រូបាប': ['Probability'],
  'ចម្ងាយរវាងពីរចំណុច': ['Distance Between Two Points'],
  'សមីការនៃបន្ទាត់': ['Functions & Graphs'],
  'ប្រព័ន្ធសមីការដឺក្រេទី១មានពីរអញ្ញាត': ['Systems of Linear Equations'],
  'ទ្រឹស្ដីបទពីតាករ': ['Pythagorean Theorem'],
  'រង្វង់និងបន្ទាត់': ['Circles'],
  'មុំកណ្តាលនិងមុំចារឹកក្នុងរង្វង់': ['Angle Properties of a Circle'],
  'ទ្រឹស្ដីបទថាឡែស': ["Thales' Theorem"],
  'ត្រីកោណដូចគ្នា': ['Similar Triangles', 'ត្រីកោណប៉ុនគ្នា'],
  'ពហុកោណ': ['Polygons'],
  'សូលីត': ['Solid Geometry & Volume'],
};

async function seed() {
  console.log(`🌱 Grade-9 Math practice seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const subject = await prisma.subject.findUnique({
    where: { code: SUBJECT_CODE },
    select: { id: true },
  });
  if (!subject) throw new Error(`Subject ${SUBJECT_CODE} not found`);

  const author = AUTHOR_OVERRIDE
    ? await prisma.user.findUnique({ where: { id: AUTHOR_OVERRIDE }, select: { id: true, role: true } })
    : await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'TEACHER'] } },
        select: { id: true, role: true },
        orderBy: { createdAt: 'asc' },
      });
  if (!author) throw new Error('No author user found — pass --author <userId>');
  console.log(`✍️  Author: ${author.id} (${author.role})\n`);

  let createdPosts = 0;
  let skipped = 0;

  for (const [unitName, seedQuestions] of Object.entries(PRACTICE)) {
    const topic = await prisma.topic.findFirst({
      where: { subjectId: subject.id, parentId: null, name: unitName },
      select: { id: true, nameKh: true },
    });
    if (!topic) {
      console.log(`  ⏭️  unit "${unitName}" not found in taxonomy — run seed-topics-math-g9 first`);
      skipped += 1;
      continue;
    }

    const title = `Practice: ${unitName}`;
    const possibleTitles = [title, ...(OLD_NAMES[unitName] || []).map((old) => `Practice: ${old}`)];
    const existing = await prisma.post.findFirst({
      where: { authorId: author.id, postType: 'QUIZ', title: { in: possibleTitles } },
      select: { id: true, title: true },
    });

    if (existing) {
      console.log(`  ✏️  updating "${existing.title}" -> "${title}" (${existing.id})`);
      if (APPLY) {
        const prepared = prepareQuizQuestions(
          seedQuestions.map((q) => ({
            text: q.text,
            type: q.type,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            points: 1,
            explanation: q.explanation,
            topicId: topic.id,
          })),
          { validTopicIds: new Set([topic.id]) },
        );
        await prisma.$transaction(async (tx) => {
          await tx.post.update({
            where: { id: existing.id },
            data: {
              title,
              content: `លំហាត់អនុវត្តន៍ ${topic.nameKh ?? unitName} (គណិតវិទ្យា ថ្នាក់ទី៩)`,
            },
          });
          const quiz = await tx.quiz.findFirst({ where: { postId: existing.id }, select: { id: true } });
          if (quiz) {
            await tx.quiz.update({
              where: { id: quiz.id },
              data: {
                questions: prepared.questionsJson as any,
                totalPoints: prepared.questionsJson.reduce((sum, q) => sum + q.points, 0),
              },
            });
            await tx.quizQuestion.deleteMany({ where: { postId: existing.id } });
            await tx.quizQuestion.createMany({
              data: prepared.rows.map((row) => ({
                id: row.id,
                postId: existing.id,
                question: row.question,
                options: row.options,
                correctAnswer: row.correctAnswer,
                points: row.points,
                position: row.position,
                explanation: row.explanation,
                topicId: row.topicId,
              })),
            });
          }
        });
      }
      createdPosts += 1;
      continue;
    }

    const prepared = prepareQuizQuestions(
      seedQuestions.map((q) => ({
        text: q.text,
        type: q.type,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        points: 1,
        explanation: q.explanation,
        topicId: topic.id,
      })),
      { validTopicIds: new Set([topic.id]) },
    );

    console.log(`  ➕ "${title}" — ${prepared.rows.length} questions (row-backed) → topic ${topic.id}`);
    createdPosts += 1;
    if (!APPLY) continue;

    await prisma.post.create({
      data: {
        authorId: author.id,
        content: `លំហាត់អនុវត្តន៍ ${topic.nameKh ?? unitName} (គណិតវិទ្យា ថ្នាក់ទី៩)`,
        title,
        postType: 'QUIZ',
        visibility: 'PUBLIC',
        topicTags: ['mathematics', 'grade9'],
        quiz: {
          create: {
            questions: prepared.questionsJson as any,
            timeLimit: 0,
            passingScore: 70,
            totalPoints: prepared.questionsJson.reduce((sum, q) => sum + q.points, 0),
            resultsVisibility: 'AFTER_SUBMISSION',
            shuffleQuestions: false,
            shuffleAnswers: false,
            showReview: true,
            showExplanations: true,
          },
        },
        quizQuestions: {
          create: prepared.rows.map((row) => ({
            id: row.id,
            question: row.question,
            options: row.options,
            correctAnswer: row.correctAnswer,
            points: row.points,
            position: row.position,
            explanation: row.explanation,
            topicId: row.topicId,
          })),
        },
      },
      select: { id: true },
    });
  }

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${createdPosts} practice posts, ${skipped} skipped.`
  );
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
