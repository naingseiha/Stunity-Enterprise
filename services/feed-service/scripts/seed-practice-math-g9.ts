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
  /** 1 (easiest) .. 5 (hardest) — optional, only for newly-authored questions. */
  difficulty?: number;
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
      type: 'MULTIPLE_CHOICE',
      text: 'គណនា និងសម្រួលកន្សោម៖ $3\\sqrt{12} - 2\\sqrt{27}$ ។',
      options: ['0', '\\sqrt{3}', '-\\sqrt{3}', '3\\sqrt{3}'],
      correctAnswer: 0,
      explanation: '$3\\sqrt{12} - 2\\sqrt{27} = 3(2\\sqrt{3}) - 2(3\\sqrt{3}) = 6\\sqrt{3} - 6\\sqrt{3} = 0$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើកូនិវាហក (Conjugate) នៃកន្សោម $3 - \\sqrt{5}$ គឺជានរណា?',
      options: ['3 + \\sqrt{5}', '-3 - \\sqrt{5}', '\\sqrt{5} - 3', '\\frac{1}{3-\\sqrt{5}}'],
      correctAnswer: 0,
      explanation: 'កូនិវាហកនៃ $a - \\sqrt{b}$ គឺ $a + \\sqrt{b}$ ដូចនេះកូនិវាហកនៃ $3 - \\sqrt{5}$ គឺ $3 + \\sqrt{5}$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: '$\\sqrt{2}$ គឺជាចំនួនសនិទាន។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: '$\\sqrt{2} \\approx 1.414...$ ជាចំនួនអសនិទាន ព្រោះវាមិនអាចសរសេរជាទម្រង់ប្រភាគ $\\frac{a}{b}$ បានឡើយ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'តម្រឹម ឬសម្រួលកន្សោម $\\sqrt{(-5)^2}$ ស្មើនឹង $-5$ ។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'តាមលក្ខណៈឫសការេ $\\sqrt{x^2} = |x|$ ដូចនេះ $\\sqrt{(-5)^2} = |-5| = 5$ មិនមែន $-5$ ឡើយ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'គណនាតម្លៃនៃ $\\sqrt{16} + \\sqrt{9}$ ។',
      correctAnswer: '7',
      explanation: '$\\sqrt{16} = 4$ និង $\\sqrt{9} = 3$ ដូចនេះ $4 + 3 = 7$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'បំបាត់រ៉ាឌីកាល់ពីភាគបែងនៃកន្សោម $\\frac{6}{\\sqrt{3}}$ ហើយសរសេរចម្លើយចុងក្រោយ (ឧទាហរណ៍៖ 2\\sqrt{3})។',
      correctAnswer: '2\\sqrt{3}',
      explanation: '$\\frac{6}{\\sqrt{3}} = \\frac{6\\sqrt{3}}{\\sqrt{3} \\times \\sqrt{3}} = \\frac{6\\sqrt{3}}{3} = 2\\sqrt{3}$ ។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ចំនួនដែលមិនអាចសរសេរជាទម្រង់ប្រភាគ $\\frac{a}{b}$ (ដែល $a, b$ ជាចំនួនគត់ ហើយ $b \\neq 0$) បានឡើយ ហៅថាចំនួន_______។',
      correctAnswer: 'អសនិទាន',
      explanation: 'តាមនិយមន័យ ចំនួនដែលមិនអាចសរសេរជាប្រភាគបាន ហៅថាចំនួនអសនិទាន (Irrational Numbers)។',
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
      type: 'MULTIPLE_CHOICE',
      text: 'រកតម្លៃ $x$ ក្នុងសមាមាត្រ $x : 5 = 12 : 20$ ។',
      options: ['2', '3', '4', '5'],
      correctAnswer: 1,
      explanation: '$\\frac{x}{5} = \\frac{12}{20} \\implies 20x = 60 \\implies x = 3$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងថ្នាក់រៀនមួយមានសិស្ស ៤០ នាក់។ ផលធៀបសិស្សប្រុស និងសិស្សស្រីគឺ $3 : 5$ ។ តើថ្នាក់នោះមានសិស្សស្រីប៉ុន្មាននាក់?',
      options: ['15', '20', '25', '30'],
      correctAnswer: 2,
      explanation: 'ចំណែកសិស្សស្រីគឺ $\\frac{5}{3+5} \\times 40 = \\frac{5}{8} \\times 40 = 25$ នាក់។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បើ $\\frac{x}{4} = \\frac{9}{12}$ នាំឱ្យ $x = 3$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: '$12x = 36 \\implies x = 3$ ពិតប្រាកដមែន។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'កម្មករ ៤ នាក់សង់កំផែងមួយចប់ក្នុងរយៈពេល ៦ ថ្ងៃ។ បើគេប្រើកម្មករ ៨ នាក់ នោះគេនឹងប្រើពេល ១២ ថ្ងៃទើបសង់ចប់។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'នេះជាសមាមាត្រច្រាស (Inversely Proportional)។ កើនកម្មករ ២ ដង ពេលវេលាត្រូវថយ ២ ដង គឺសល់ត្រឹម $6 \\div 2 = 3$ ថ្ងៃប៉ុណ្ណោះ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'អាងមួយអាចចំណុះទឹក $7650\\text{ dm}^3$។ បើគេបញ្ចូលទឹកក្នុងល្បឿន $85\\text{ dm}^3$ ក្នុងរយៈពេល $2$ នាទី តើគេត្រូវប្រើពេលប៉ុន្មាននាទីទើបបញ្ចូលទឹកពេញអាង?',
      correctAnswer: '180',
      explanation: 'ល្បឿនបញ្ចូលទឹកគឺ $85/2 = 42.5\\text{ dm}^3/\\text{min}$។ ពេលវេលាត្រូវប្រើគឺ $7650 / 42.5 = 180$ នាទី។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ផែនទីមួយមានមាត្រដ្ឋាន $1 : 50,000$។ បើចម្ងាយលើផែនទីគឺ $4\\text{ cm}$ តើចម្ងាយពិតលើដីស្មើនឹងប៉ុន្មានគីឡូម៉ែត្រ (km)?',
      correctAnswer: '2',
      explanation: '$4\\text{ cm} \\times 50,000 = 200,000\\text{ cm} = 2,000\\text{ m} = 2\\text{ km}$ ។',
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
      type: 'MULTIPLE_CHOICE',
      text: 'ដាក់ជាផលគុណកត្តានៃកន្សោម $x^3 - 8$ ។',
      options: [
        '(x - 2)(x^2 + 2x + 4)',
        '(x - 2)(x^2 - 2x + 4)',
        '(x + 2)(x^2 - 2x + 4)',
        '(x - 2)^3'
      ],
      correctAnswer: 0,
      explanation: 'តាមរូបមន្តផលដកគូប $a^3 - b^3 = (a - b)(a^2 + ab + b^2)$ នាំឱ្យ $x^3 - 8 = (x - 2)(x^2 + 2x + 4)$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ពន្លាតការេនៃទ្វេធា $(2x - 3)^2$ ។',
      options: [
        '4x^2 - 12x + 9',
        '4x^2 - 6x + 9',
        '4x^2 - 9',
        '2x^2 - 12x + 9'
      ],
      correctAnswer: 0,
      explanation: 'តាមរូបមន្ត $(a - b)^2 = a^2 - 2ab + b^2$ នាំឱ្យ $(2x - 3)^2 = 4x^2 - 12x + 9$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'កន្សោម $x^2 - 9$ អាចសរសេរជាផលគុណកត្តាបានជា $(x - 3)(x - 3)$។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'តាមរូបមន្តផលដកការេ $a^2-b^2 = (a-b)(a+b)$ នាំឱ្យ $x^2-9 = (x-3)(x+3)$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ចំពោះគ្រប់តម្លៃ $x, y$ សម្មភាព $(x + y)^2 = x^2 + y^2$ គឺពិតជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: '$(x + y)^2 = x^2 + 2xy + y^2$ មិនមែន $x^2 + y^2$ ឡើយ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកដឺក្រេនៃពហុធា $5x^4 - 2x^3 + 7x - 1$ ។',
      correctAnswer: '4',
      explanation: 'ដឺក្រេនៃពហុធាគឺជាស្វ័យគុណខ្ពស់បំផុតរបស់អថេរ $x$ ដែលក្នុងករណីនេះគឺ 4។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'សម្រួលកន្សោមប្រភាគ $\\frac{x^2 - 4}{x - 2}$ (ចំពោះ $x \\neq 2$) ហើយគណនាតម្លៃរបស់វានៅពេល $x = 10$ ។',
      correctAnswer: '12',
      explanation: '$\\frac{x^2 - 4}{x - 2} = \\frac{(x-2)(x+2)}{x-2} = x + 2$។ ពេល $x = 10$ គេបាន $10 + 2 = 12$ ។',
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
      type: 'MULTIPLE_CHOICE',
      text: 'រកតម្លៃ $x$ ដែលជាចម្លើយនៃសមីការប្រភាគ៖ $\\frac{2x - 1}{3} = \\frac{x + 4}{2}$ ។',
      options: ['x = 8', 'x = 10', 'x = 12', 'x = 14'],
      correctAnswer: 3,
      explanation: 'គុណខ្នែង៖ $2(2x - 1) = 3(x + 4) \\implies 4x - 2 = 3x + 12 \\implies x = 14$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ឪពុកមានអាយុចម្រើនជាងកូន ៣ ដង។ ក្នុងរយៈពេល ១០ ឆ្នាំទៀត ផលបូកអាយុអ្នកទាំងពីរស្មើនឹង ៧៦ ឆ្នាំ។ តើបច្ចុប្បន្នកូនមានអាយុប៉ុន្មានឆ្នាំ?',
      options: ['12', '14', '15', '16'],
      correctAnswer: 1,
      explanation: 'តាង $x$ ជាអាយុកូន $\\implies$ អាយុឪពុក ៣$x$។ ១០ឆ្នាំទៀត៖ $(x+10) + (3x+10) = 76 \\implies 4x + 20 = 76 \\implies 4x = 56 \\implies x = 14$ ឆ្នាំ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ចម្លើយនៃសមីការ $3(x - 2) = 9$ គឺ $x = 5$។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: '$x-2 = 3 \\implies x = 5$ ពិតប្រាកដមែន។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'សមីការ $0x = 5$ មានចម្លើយរាប់មិនអស់។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'គ្មានចំនួនពិតណាគុណនឹង ០ ស្មើ ៥ ឡើយ ដូចនេះសមីការនេះគ្មានចម្លើយ (No Solution)។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកតម្លៃ $x$ នៃសមីការ $5x - 7 = 3x + 5$ ។',
      correctAnswer: '6',
      explanation: '$5x - 3x = 5 + 7 \\implies 2x = 12 \\implies x = 6$។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ចតុកោណកែងមួយមានបរិមាត្រ $50\\text{ cm}$ ហើយបណ្តោយវែងជាងទទឹង $5\\text{ cm}$។ រកប្រវែងទទឹងជាសង់ទីម៉ែត្រ (cm)។',
      correctAnswer: '10',
      explanation: 'តាងទទឹង $w \\implies$ បណ្តោយ $w+5$។ បរិមាត្រ៖ $2(w + w + 5) = 50 \\implies 4w + 10 = 50 \\implies 4w = 40 \\implies w = 10\\text{ cm}$ ។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'សមីការពីរដែលមានសំណុំចម្លើយដូចគ្នាបេះបិទ ហៅថាសមីការ_______នឹងគ្នា។',
      correctAnswer: 'សមមូល',
      explanation: 'តាមនិយមន័យ សមីការពីរដែលមានសំណុំចម្លើយដូចគ្នា ហៅថាសមីការសមមូល (Equivalent Equations)។',
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
      text: 'ចូរផ្គូផ្គងសមីការខាងឆ្វេង ទៅនឹងប្រភេទ ឬសំណុំចម្លើយត្រូវគ្នាខាងស្តាំ៖',
      options: [
        '2x = 10:::x = 5',
        '0x = 0:::ចម្លើយរាប់មិនអស់',
        '0x = -7:::គ្មានចម្លើយ',
        '3x = 12:::x = 4',
      ],
      correctAnswer: JSON.stringify({
        '2x = 10': 'x = 5',
        '0x = 0': 'ចម្លើយរាប់មិនអស់',
        '0x = -7': 'គ្មានចម្លើយ',
        '3x = 12': 'x = 4',
      }),
      explanation: 'កំណត់ចំនួនចម្លើយតាមលក្ខណៈមេគុណនិងអង្គទីពីរ។',
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
      type: 'MULTIPLE_CHOICE',
      text: 'ដោះស្រាយវិសមីការ៖ $-3(x - 2) \\ge 15$ ។',
      options: ['x \\le -3', 'x \\ge -3', 'x \\le 3', 'x \\ge 3'],
      correctAnswer: 0,
      explanation: '$-3x + 6 \\ge 15 \\implies -3x \\ge 9$។ ចែកនឹង $-3$ ត្រូវត្រឡប់ទិសដៅ៖ $x \\le -3$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើចំនួនណាខាងក្រោមដែល *មិនមែន* ជាចម្លើយនៃវិសមីការ $2x + 5 > 11$ ?',
      options: ['3', '4', '5', '10'],
      correctAnswer: 0,
      explanation: '$2x > 6 \\implies x > 3$។ លេខ ៣ មិនធំជាង ៣ ឡើយ ដូចនេះ ៣ មិនមែនជាចម្លើយទេ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'នៅពេលគុណ ឬចែកអង្គទាំងពីរនៃវិសមីការនឹងចំនួនអវិជ្ជមាន ទិសដៅនៃវិសមភាពមិនផ្លាស់ប្តូរឡើយ។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'ច្បាប់គន្លឹះ៖ គុណ/ចែកនឹងចំនួនអវិជ្ជមាន ត្រូវត្រឡប់ទិសដៅវិសមភាពជានិច្ច។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'សំណុំចម្លើយនៃវិសមីការ $x^2 < 0$ គឺជាសំណុំទទេ $\\emptyset$ (គ្មានចម្លើយក្នុងសំណុំចំនួនពិត)។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ការេនៃគ្រប់ចំនួនពិតគឺធំជាង ឬស្មើ ០ ជានិច្ច ($x^2 \\ge 0$) ដូចនេះគ្មានតម្លៃ $x$ ណាធ្វើឱ្យ $x^2 < 0$ ឡើយ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកចំនួនគត់វិជ្ជមានធំបំផុតដែលផ្ទៀងផ្ទាត់វិសមីការ $x + 4 < 7$ ។',
      correctAnswer: '2',
      explanation: '$x < 3$ ដូចនេះចំនួនគត់វិជ្ជមានធំបំផុតគឺ 2 (ព្រោះ 3 មិនរាប់បញ្ចូល)។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រកចំនួនគត់តូចបំផុតដែលជាចម្លើយនៃវិសមីការប្រភាគ $\\frac{3x - 1}{2} > 7$ ។',
      correctAnswer: '6',
      explanation: '$3x - 1 > 14 \\implies 3x > 15 \\implies x > 5$។ ចំនួនគត់ដែលធំជាង ៥ ហើយតូចជាងគេគឺ ៦។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'លើបន្ទាត់ចំនួន (Number line) រង្វង់មូលខ្មៅ (តึប ឬ closed circle $\\bullet$) ប្រើសម្រាប់សញ្ញាវិសមភាព $\\le$ ឬ $\\ge$ ដែលមានន័យថា_______តម្លៃចុងម្ខាងនោះ។',
      correctAnswer: 'រាប់បញ្ចូល',
      explanation: 'រង្វង់តึប (Closed circle) បញ្ជាក់ថាតម្លៃត្រង់ចំណុចនោះត្រូវបានរាប់បញ្ចូលក្នុងសំណុំចម្លើយ។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំជំហានដោះស្រាយ និងបកស្រាយវិសមីការ $4 - 2x < 10$ លើបន្ទាត់ចំនួន៖',
      options: [
        'ដក 4 ពីអង្គទាំងពីរ បាន $-2x < 6$',
        'ចែកនឹង $-2$ ហើយត្រឡប់ទិសដៅវិសមភាព បាន $x > -3$',
        'គូសបន្ទាត់ចំនួន ហើយដៅចំណុច $-3$',
        'គូសរង្វង់ប្រហោង $\\circ$ នៅត្រង់ $-3$ ហើយគូសព្រួញទៅខាងស្តាំ'
      ],
      correctAnswer: '',
      explanation: 'ដោះស្រាយវិសមីការរក x រួចទើបគូសបន្ទាត់ និងដៅសំណុំចម្លើយ។',
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
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងតារាងបំណែងចែកប្រេកង់ជាថ្នាក់ បើចន្លោះថ្នាក់មួយគឺ $20 - 30$ តើផ្ចិតថ្នាក់ (Class Midpoint) ស្មើនឹងប៉ុន្មាន?',
      options: ['20', '25', '30', '10'],
      correctAnswer: 1,
      explanation: 'ផ្ចិតថ្នាក់ $= \\frac{\\text{គោលក្រោម} + \\text{គោលលើ}}{2} = \\frac{20 + 30}{2} = 25$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើប្រវែងចន្លោះថ្នាក់ ឬវិសាលភាពថ្នាក់ (Class Width) នៃថ្នាក់ $10 - 19$ (ទិន្នន័យជាចំនួនគត់) ស្មើនឹងប៉ុន្មាន?',
      options: ['9', '10', '19', '14.5'],
      correctAnswer: 1,
      explanation: 'វិសាលភាពថ្នាក់ $= 19 - 10 + 1 = 10$ (ឬគោលលើពិត ដកគោលក្រោមពិត៖ $19.5 - 9.5 = 10$)។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ផលបូកនៃប្រេកង់ទាក់ទងទាំងអស់ គឺស្មើនឹង ១ ជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ព្រោះប្រេកង់ទាក់ទងនីមួយៗស្មើ $f/N$ នាំឱ្យផលបូករបស់វាស្មើ $\\sum f / N = N/N = 1$។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ក្នុងតារាងប្រេកង់កើន តម្លៃប្រេកង់កើនចុងក្រោយគេបង្អស់ គឺស្មើនឹងចំនួនទិន្នន័យសរុប $N$ ជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ប្រេកង់កើនចុងក្រោយគឺជាផលបូកប្រេកង់គ្រប់ថ្នាក់ទាំងអស់ ដែលស្មើនឹង $N$។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'បើប្រេកង់ទាក់ទងនៃថ្នាក់មួយគឺ $0.24$ ហើយចំនួនទិន្នន័យសរុប $N = 50$ តើប្រេកង់ $f$ នៃថ្នាក់នោះស្មើប៉ុន្មាន?',
      correctAnswer: '12',
      explanation: '$f = \\text{ប្រេកង់ទាក់ទង} \\times N = 0.24 \\times 50 = 12$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងចំណោមសិស្ស ៤០ នាក់ មាន ១០ នាក់បានពិន្ទុក្នុងថ្នាក់ [50-60) និង ១៥ នាក់ក្នុងថ្នាក់ [60-70)។ តើប្រេកង់កើនត្រឹមថ្នាក់ [60-70) ស្មើនឹងប៉ុន្មាន?',
      correctAnswer: '25',
      explanation: 'ប្រេកង់កើន $= 10 + 15 = 25$ នាក់។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ផលធៀបរវាងប្រេកង់នៃថ្នាក់មួយ ទៅនឹងប្រេកង់សរុប $N$ ហៅថាប្រេកង់_______។',
      correctAnswer: 'ទាក់ទង',
      explanation: 'ប្រេកង់ទាក់ទង (Relative Frequency) $= \\frac{f}{N}$ ។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំជំហានគូរតារាងបំណែងចែកប្រេកង់ តាមលំដាប់លំដោយការងារត្រឹមត្រូវ៖',
      options: [
        'ប្រមូលទិន្នន័យឆៅ',
        'រកតម្លៃអតិបរមា និងអប្បបរមា',
        'កំណត់ចំនួនថ្នាក់ និងវិសាលភាពថ្នាក់',
        'រាប់ចំនួនទិន្នន័យក្នុងថ្នាក់នីមួយៗ (ប្រេកង់)'
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
      text: 'គណនាមធ្យមភាគ (Mean) នៃសំណុំទិន្នន័យ៖ 4, 6, 8, 10 ។',
      options: ['6', '7', '8', '9'],
      correctAnswer: 1,
      explanation: '$\\text{Mean} = \\frac{4 + 6 + 8 + 10}{4} = \\frac{28}{4} = 7$។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'រកមេដ្យាន (Median) នៃសំណុំទិន្នន័យ៖ 3, 5, 7, 9, 11 ។',
      options: ['5', '7', '9', '8'],
      correctAnswer: 1,
      explanation: 'ទិន្នន័យត្រូវបានរៀបចំរួចជាស្រេច។ តម្លៃដែលនៅចំកណ្តាលគេ (តួទី៣) គឺ 7។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើម៉ូត (Mode) នៃសំណុំទិន្នន័យ 2, 3, 3, 4, 5 ស្មើនឹងប៉ុន្មាន?',
      options: ['2', '3', '4', '5'],
      correctAnswer: 1,
      explanation: 'លេខ 3 កើតឡើងញឹកញាប់ជាងគេ (២ ដង) ដូចនេះម៉ូតគឺ 3។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ក្នុងបំណែងចែកស៊ីមេទ្រី (Symmetrical Distribution) មធ្យមនព្វន្ត មេដ្យាន និងម៉ូត មានតម្លៃស្មើគ្នាជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'បំណែងចែករាងកណ្តឹង (Normal/Symmetrical) មានមធ្យមភាគ មេដ្យាន និងម៉ូតនៅត្រង់ចំណុចកណ្តាលតែមួយ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'វិសាលភាព (Range) នៃសំណុំទិន្នន័យ គឺជាផលបូករវាងតម្លៃអតិបរមា និងតម្លៃអប្បបរមា។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'វិសាលភាពគឺជា *ផលដក* រវាងតម្លៃអតិបរមា និងអប្បបរមា ($\\text{Max} - \\text{Min}$) មិនមែនផលបូកទេ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'គណនាមធ្យមនព្វន្តនៃ 10, 15, 20, 25, 30 ។',
      correctAnswer: '20',
      explanation: '$\\frac{10 + 15 + 20 + 25 + 30}{5} = \\frac{100}{5} = 20$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'បើមធ្យមនព្វន្តនៃ ៥ ចំនួនស្មើនឹង ១២ តើផលបូកនៃចំនួនទាំង ៥ នោះស្មើនឹងប៉ុន្មាន?',
      correctAnswer: '60',
      explanation: '$\\text{Sum} = \\text{Mean} \\times n = 12 \\times 5 = 60$ ។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'តម្លៃដែលមានប្រេកង់ខ្ពស់ជាងគេបំផុតក្នុងសំណុំទិន្នន័យ ហៅថា_______។',
      correctAnswer: 'ម៉ូត',
      explanation: 'តាមនិយមន័យ ម៉ូត (Mode) គឺជាតម្លៃទិន្នន័យដែលកើតឡើងញឹកញាប់ជាងគេ។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំជំហានក្នុងការរកមេដ្យាន (Median) នៃសំណុំទិន្នន័យដែលមិនទាន់រៀបចំ៖',
      options: [
        'រៀបចំទិន្នន័យតាមលំដាប់ពីតូចទៅធំ',
        'រាប់ចំនួនទិន្នន័យសរុប $n$',
        'រកទីតាំងមេដ្យានតាមរូបមន្ត $(n+1)/2$',
        'កំណត់តម្លៃទិន្នន័យដែលនៅចំកណ្តាល (ឬមធ្យមនព្វន្តនៃពីរតួកណ្តាល)'
      ],
      correctAnswer: '',
      explanation: 'ត្រូវរៀបលំដាប់ទិន្នន័យជាមុនសិន ទើបអាចរកទីតាំង និងតម្លៃមេដ្យានបាន។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងរង្វាស់ស្ថិតិខាងឆ្វេង ទៅនឹងអត្ថន័យត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'មធ្យមនព្វន្ត (Mean):::ផលបូកទិន្នន័យចែកនឹងចំនួនទិន្នន័យ',
        'មេដ្យាន (Median):::តម្លៃទិន្នន័យដែលនៅចំកណ្តាលគេ',
        'ម៉ូត (Mode):::តម្លៃទិន្នន័យដែលកើតឡើងញឹកញាប់ជាងគេ',
        'វិសាលភាព (Range):::ផលដកតម្លែអតិបរមា និងអប្បបរមា',
      ],
      correctAnswer: JSON.stringify({
        'មធ្យមនព្វន្ត (Mean)': 'ផលបូកទិន្នន័យចែកនឹងចំនួនទិន្នន័យ',
        'មេដ្យាន (Median)': 'តម្លៃទិន្នន័យដែលនៅចំកណ្តាលគេ',
        'ម៉ូត (Mode)': 'តម្លៃទិន្នន័យដែលកើតឡើងញឹកញាប់ជាងគេ',
        'វិសាលភាព (Range)': 'ផលដកតម្លែអតិបរមា និងអប្បបរមា',
      }),
      explanation: 'និយមន័យគ្រឹះនៃរង្វាស់ទីតាំងកណ្តាល និងបំណែក។',
    },
  ],
  'ប្រូបាប': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងការបោះកាក់មួយដែលមានមុខពីរ (រូប និងអក្សរ) តើប្រូបាបដែលទទួលបានមុខ "រូប" ស្មើនឹងប៉ុន្មាន?',
      options: ['0.25', '0.5', '0.75', '1'],
      correctAnswer: 1,
      explanation: '$P(\\text{រូប}) = \\frac{1}{2} = 0.5$។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងការបោះគ្រាប់ឡុកឡាក់មួយមុខ ៦ (លេខ ១ ដល់ ៦) តើប្រូបាបទទួលបានលេខគូស្មើនឹងប៉ុន្មាន?',
      options: ['1/6', '1/3', '1/2', '2/3'],
      correctAnswer: 2,
      explanation: 'លេខគូមាន ៣ ករណី (2, 4, 6) ក្នុងចំណោម ៦ ករណី $\\implies P = \\frac{3}{6} = \\frac{1}{2}$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងថង់មួយមានបាល់ក្រហម ៣ និងបាល់ខៀវ ២។ ចាប់យកបាល់មួយដោយចៃដន្យ។ តើប្រូបាបបានបាល់ខៀវស្មើនឹងប៉ុន្មានភាគរយ?',
      options: ['20%', '30%', '40%', '60%'],
      correctAnswer: 2,
      explanation: '$P(\\text{ខៀវ}) = \\frac{2}{3+2} = \\frac{2}{5} = 0.4 = 40\\%$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ប្រូបាបនៃព្រឹត្តិការណ៍ណាមួយ $A$ តែងតែស្ថិតនៅចន្លោះ ០ និង ១ ជានិច្ច៖ $0 \\le P(A) \\le 1$ ។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'លទ្ធផលប្រូបាបមិនអាចអវិជ្ជមាន ឬធំជាង ១ (១០០%) បានឡើយ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ប្រូបាបនៃព្រឹត្តិការណ៍មិនអាចមាន (Impossible Event) គឺស្មើនឹង ១។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'ព្រឹត្តិការណ៍មិនអាចមានមានប្រូបាបស្មើ ០។ ឯព្រឹត្តិការណ៍ប្រាកដទើបស្មើ ១។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'គេដកបៀមួយសន្លឹកដោយចៃដន្យពីហ្វូងបៀ ៥២ សន្លឹក។ តើប្រូបាបបានបៀសន្លឹក "អាត់" (Ace) ស្មើនឹងប៉ុន្មាន? (សរសេរជាប្រភាគសម្រួលរួច ឧទាហរណ៍៖ 1/13)',
      correctAnswer: '1/13',
      explanation: 'បៀអាត់មាន ៤ សន្លឹក $\\implies P = \\frac{4}{52} = \\frac{1}{13}$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'បើប្រូបាបនៃព្រឹត្តិការណ៍ $A$ គឺ $P(A) = 0.35$ តើប្រូបាបនៃព្រឹត្តិការណ៍បំពេញ $P(A\')$ ស្មើនឹងប៉ុន្មាន?',
      correctAnswer: '0.65',
      explanation: '$P(A\') = 1 - P(A) = 1 - 0.35 = 0.65$ ។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'ផលបូកប្រូបាបនៃព្រឹត្តិការណ៍ $A$ និងព្រឹត្តិការណ៍បំពេញ $A\'$ គឺស្មើនឹង_______ជានិច្ច។',
      correctAnswer: '1',
      explanation: '$P(A) + P(A\') = 1$ (ឬ ១០០%)។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំតម្លៃប្រូបាបខាងក្រោមពីតូចទៅធំ (ពីលទ្ធផលមិនអាចកើតឡើង ទៅប្រាកដបំផុត)៖',
      options: [
        '0 (ព្រឹត្តិការណ៍មិនអាចមាន)',
        '0.25 (២៥%)',
        '0.5 (៥០% ឬពាក់កណ្តាល)',
        '1 (ព្រឹត្តិការណ៍ប្រាកដ)'
      ],
      correctAnswer: '',
      explanation: 'លំដាប់គឺ 0, 0.25, 0.5, 1។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងពាក្យបច្ចេកទេសប្រូបាបខាងឆ្វេង ទៅនឹងអត្ថន័យត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'Sample Space:::សំណុំនៃលទ្ធផលអាចមានទាំងអស់',
        'Event:::សំណុំរងនៃលំហសំណាក',
        'Certain Event:::ព្រឹត្តិការណ៍ដែលមានប្រូបាបស្មើ ១',
        'Impossible Event:::ព្រឹត្តិការណ៍ដែលមានប្រូបាបស្មើ ០',
      ],
      correctAnswer: JSON.stringify({
        'Sample Space': 'សំណុំនៃលទ្ធផលអាចមានទាំងអស់',
        'Event': 'សំណុំរងនៃលំហសំណាក',
        'Certain Event': 'ព្រឹត្តិការណ៍ដែលមានប្រូបាបស្មើ ១',
        'Impossible Event': 'ព្រឹត្តិការណ៍ដែលមានប្រូបាបស្មើ ០',
      }),
      explanation: 'និយមន័យក្នុងមេរៀនប្រូបាបថ្នាក់ទី៩។',
    },
  ],
  'ចម្ងាយរវាងពីរចំណុច': [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'គណនាចម្ងាយរវាងគល់តម្រុយ $O(0,0)$ និងចំណុច $A(3,4)$ ។',
      options: ['4', '5', '6', '7'],
      correctAnswer: 1,
      explanation: '$OA = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើរូបមន្តចម្ងាយរវាងពីរចំណុច $A(x_1, y_1)$ និង $B(x_2, y_2)$ គឺជានរណា?',
      options: [
        '\\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}',
        '\\sqrt{(x_2+x_1)^2 + (y_2+y_1)^2}',
        '(x_2-x_1) + (y_2-y_1)',
        '\\sqrt{(x_2-y_1)^2 + (y_2-x_1)^2}'
      ],
      correctAnswer: 0,
      explanation: 'តាមទ្រឹស្ដីបទពីតាករ ចម្ងាយ $AB = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'រកកូអរដោនេនៃចំណុចកណ្តាល $M$ លើអង្កត់ $AB$ ដែល $A(2,4)$ និង $B(6,8)$ ។',
      options: ['(3, 5)', '(4, 6)', '(8, 12)', '(2, 2)'],
      correctAnswer: 1,
      explanation: '$M = (\\frac{2+6}{2}, \\frac{4+8}{2}) = (4, 6)$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ចម្ងាយរវាងពីរចំណុចលើប្លង់កូអរដោនេអាចមានតម្លៃអវិជ្ជមាន។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'ចម្ងាយជារង្វាស់ប្រវែង ដូចនេះវាមានតម្លៃធំជាង ឬស្មើ ០ ជានិច្ច ($d \\ge 0$)។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បើចំណុចពីរស្ថិតលើបន្ទាត់ឈរតែមួយ (មានអាប់ស៊ីសដូចគ្នា) នោះចម្ងាយរវាងចំណុចទាំងពីរស្មើនឹងតម្លៃដាច់ខាតនៃផលដកអរដោនេ $|y_2 - y_1|$ ។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ពេល $x_1 = x_2$ រូបមន្តចម្ងាយក្លាយជា $\\sqrt{(0)^2 + (y_2-y_1)^2} = |y_2-y_1|$ ពិតមែន។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'គណនាចម្ងាយរវាងចំណុច $P(-1, -2)$ និង $Q(5, 6)$ ។',
      correctAnswer: '10',
      explanation: '$PQ = \\sqrt{(5 - (-1))^2 + (6 - (-2))^2} = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ចំណុចកណ្តាលនៃអង្កត់ $AB$ គឺ $M(3, -4)$។ បើ $A(0,0)$ រកផលបូកកូអរដោនេនៃចំណុច $B(x, y)$ គឺ $x + y$ ។',
      correctAnswer: '-2',
      explanation: '$\\frac{0+x}{2} = 3 \\implies x = 6$ និង $\\frac{0+y}{2} = -4 \\implies y = -8$។ ផលបូក $6 + (-8) = -2$ ។',
    },
    {
      type: 'FILL_IN_BLANK',
      text: 'រូបមន្តកូអរដោនេនៃចំណុចកណ្តាល $M$ លើអង្កត់ $AB$ គឺ $M = (\\frac{x_1+x_2}{2}, \\frac{_______}{2})$ ។',
      correctAnswer: 'y_1+y_2',
      explanation: 'ចំណុចកណ្តាលគឺជាមធ្យមនព្វន្តនៃអាប់ស៊ីស និងអរដោនេ។',
    },
    {
      type: 'ORDERING',
      text: 'ចូររៀបចំជំហានគណនាចម្ងាយរវាងចំណុច $A(-2, 3)$ និង $B(4, -5)$៖',
      options: [
        'រកផលដកអាប់ស៊ីស $x_2 - x_1 = 4 - (-2) = 6$',
        'រកផលដកអរដោនេ $y_2 - y_1 = -5 - 3 = -8$',
        'លើកជាការេ និងបូកបញ្ចូលគ្នា៖ $6^2 + (-8)^2 = 36 + 64 = 100$',
        'បំពេញឫសការេ៖ $\\sqrt{100} = 10$'
      ],
      correctAnswer: '',
      explanation: 'គណនាផលដកតាមអ័ក្សនីមួយៗ លើកជាការេ បូកបញ្ចូលគ្នា រួចបំពាក់ឫសការេ។',
    },
    {
      type: 'MATCHING',
      text: 'ចូរផ្គូផ្គងពាក្យបច្ចេកទេសធរណីមាត្រវិភាគខាងឆ្វេង ទៅនឹងអត្ថន័យត្រូវគ្នាខាងស្តាំ៖',
      options: [
        'អាប់ស៊ីស (Abscissa):::កូអរដោនេទីមួយ x លើអ័ក្សដេក',
        'អរដោនេ (Ordinate):::កូអរដោនេទីពីរ y លើអ័ក្សឈរ',
        'គល់តម្រុយ (Origin):::ចំណុចប្រសព្វ O(0,0) នៃអ័ក្សទាំងពីរ',
        'ចម្ងាយ (Distance):::ប្រវែងអង្កត់តភ្ជាប់រវាងពីរចំណុច',
      ],
      correctAnswer: JSON.stringify({
        'អាប់ស៊ីស (Abscissa)': 'កូអរដោនេទីមួយ x លើអ័ក្សដេក',
        'អរដោនេ (Ordinate)': 'កូអរដោនេទីពីរ y លើអ័ក្សឈរ',
        'គល់តម្រុយ (Origin)': 'ចំណុចប្រសព្វ O(0,0) នៃអ័ក្សទាំងពីរ',
        'ចម្ងាយ (Distance)': 'ប្រវែងអង្កត់តភ្ជាប់រវាងពីរចំណុច',
      }),
      explanation: 'និយមន័យគ្រឹះលើប្លង់កាតេស៊ីយ៉ាង។',
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
      type: 'MULTIPLE_CHOICE',
      text: 'រកមេគុណប្រាប់ទិសនៃបន្ទាត់ដែលឆ្លងកាត់ចំណុច $(0, 0)$ និង $(3, 6)$ ។',
      options: ['1', '2', '3', '6'],
      correctAnswer: 1,
      explanation: '$a = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{6 - 0}{3 - 0} = 2$។',
    },
  ],
  'ប្រព័ន្ធសមីការដឺក្រេទី១មានពីរអញ្ញាត': [
    {
      type: 'TRUE_FALSE',
      // NOTE: original question text was corrupted in a prior edit; the lead-in clause below
      // was reconstructed to make this a complete sentence — please double-check wording.
      text: 'ប្រសិនបើប្រព័ន្ធសមីការមានក្រាហ្វជាបន្ទាត់ពីរដែលត្រួតស៊ីគ្នាទាំងស្រុង នោះប្រព័ន្ធសមីការមានចម្លើយរាប់មិនអស់។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'បន្ទាត់ត្រួតស៊ីគ្នានឹងមានចំណុចប្រសព្វរាប់មិនអស់ នាំឱ្យប្រព័ន្ធមានចម្លើយរាប់មិនអស់។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងប្រព័ន្ធសមីការ $x + 2y = 8$ ប្រសិនបើ $x = 2$ តើ $y$ ស្មើប៉ុន្មាន?',
      correctAnswer: '3',
      explanation: 'ជំនួស $x=2$ នាំឱ្យ $2 + 2y = 8 \\implies 2y = 6 \\implies y = 3$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ផលបូកនៃពីរចំនួនស្មើនឹង ២០ ហើយផលដកនៃចំនួនទាំងពីរស្មើនឹង ៤។ រកចំនួនដែលធំជាងគេក្នុងចំណោមចំនួនទាំងពីរនោះ។',
      correctAnswer: '12',
      explanation: 'តាង $x$ ជាចំនួនធំ $y$ ជាចំនួនតូច៖ $x+y=20$ និង $x-y=4 \\implies 2x=24 \\implies x=12$ ។',
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
        'យកតម្លៃអញ្ញាតទី១ដែលរកឃើញទៅជំនួសដើម្បីរកអញ្ញាតទី២'
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
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងត្រីកោណកែង $ABC$ កែងត្រង់ $A$ តើទំនាក់ទំនងពីតាករមួយណាត្រឹមត្រូវ?',
      options: [
        'BC^2 = AB^2 + AC^2',
        'AB^2 = BC^2 + AC^2',
        'AC^2 = AB^2 + BC^2',
        'BC = AB + AC'
      ],
      correctAnswer: 0,
      explanation: 'អ៊ីប៉ូតេនុស $BC$ លើកជាការេ ស្មើនឹងផលបូកការេនៃជ្រុងជាប់មុំកែងទាំងពីរ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ត្រីកោណកែងមួយមានអ៊ីប៉ូតេនុសប្រវែង ១៣ និងជ្រុងកែងមួយប្រវែង ៥។ តើជ្រុងកែងមួយទៀតមានប្រវែងប៉ុន្មាន?',
      options: ['10', '11', '12', '14'],
      correctAnswer: 2,
      explanation: '$b = \\sqrt{13^2 - 5^2} = \\sqrt{169 - 25} = \\sqrt{144} = 12$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ត្រីកោណដែលមានប្រវែងជ្រុង ៥, ១២, និង ១៣ ជាត្រីកោណកែង។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: '$5^2 + 12^2 = 25 + 144 = 169 = 13^2$ (ផ្ទៀងផ្ទាត់តាមទ្រឹស្ដីបទច្រាសពីតាករ)។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ទ្រឹស្ដីបទពីតាករអាចអនុវត្តបានចំពោះគ្រប់ប្រភេទត្រីកោណទាំងអស់ (រួមទាំងត្រីកោណទាល និងត្រីកោណស្រួច)។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'ទ្រឹស្ដីបទពីតាករអនុវត្តបាន *តែចំពោះត្រីកោណកែង* ប៉ុណ្ណោះ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងត្រីកោណកែងមួយ អ៊ីប៉ូតេនុសស្មើ ១០ និងជ្រុងកែងមួយស្មើ ៦។ រកប្រវែងជ្រុងកែងមួយទៀត។',
      correctAnswer: '8',
      explanation: '$b = \\sqrt{10^2 - 6^2} = \\sqrt{100 - 36} = \\sqrt{64} = 8$។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ការ៉េមួយមានប្រវែងជ្រុង ៥ សង់ទីម៉ែត្រ។ រកប្រវែងអង្កត់ទ្រូងនៃការ៉េនោះ (សរសេរជាទម្រង់ a\\sqrt{2} ឧទាហរណ៍៖ 5\\sqrt{2})។',
      correctAnswer: '5\\sqrt{2}',
      explanation: 'អង្កត់ទ្រូងការ៉េ $d = \\sqrt{s^2 + s^2} = s\\sqrt{2} = 5\\sqrt{2}$ ។',
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
        'ជ្រុងកែង 6, 8 (អ៊ីប៉ូតេនុស 10)',
        'ជ្រុងកែង 5, 12 (អ៊ីប៉ូតេនុស 13)',
        'ជ្រុងកែង 9, 12 (អ៊ីប៉ូតេនុស 15)'
      ],
      correctAnswer: '',
      explanation: 'អ៊ីប៉ូតេនុសគណនាបានរៀងគ្នាគឺ 5, 10, 13, 15។',
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
      type: 'MULTIPLE_CHOICE',
      text: 'តើរូបមន្តក្រឡាផ្ទៃថាស (Area of a circle) ដែលមានកាំ $r$ គឺជានរណា?',
      options: ['A = 2\\pi r', 'A = \\pi r^2', 'A = 2\\pi r^2', 'A = \\pi d'],
      correctAnswer: 1,
      explanation: 'ក្រឡាផ្ទៃថាស ឬរង្វង់គឺ $A = \\pi r^2$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'បើថាសមួយមានអង្កត់ផ្ចិត $d = 10$ តើក្រឡាផ្ទៃរបស់វាស្មើប៉ុន្មាន?',
      options: ['10\\pi', '20\\pi', '25\\pi', '100\\pi'],
      correctAnswer: 2,
      explanation: 'កាំ $r = d/2 = 5 \\implies A = \\pi(5^2) = 25\\pi$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បន្ទាត់ប៉ះរង្វង់កែងនឹងកាំត្រង់ចំណុចប៉ះជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'នេះជាលក្ខណៈគ្រឹះដ៏សំខាន់របស់បន្ទាត់ប៉ះ និងរង្វង់។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'អង្កត់បន្ទាត់ប៉ះពីរដែលគូសចេញពីចំណុចក្រៅមួយទៅកាន់រង្វង់មួយ មានប្រវែងមិនស្មើគ្នាទេ។',
      options: ['True', 'False'],
      correctAnswer: 'false',
      explanation: 'តាមទ្រឹស្ដីបទបន្ទាត់ប៉ះ អង្កត់បន្ទាត់ប៉ះទាំងពីរពីចំណុចក្រៅមួយទៅរង្វង់ *មានប្រវែងស្មើគ្នាជានិច្ច*។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'បើក្រឡាផ្ទៃថាសស្មើ $25\\pi$ តើកាំរង្វង់ស្មើប៉ុន្មាន?',
      correctAnswer: '5',
      explanation: '$A = \\pi r^2 = 25\\pi \\implies r^2 = 25 \\implies r = 5$។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'រង្វង់មួយមានកាំ $r = 6.5$ ។ គណនាប្រវែងអង្កត់ផ្ចិត $d$ នៃរង្វង់នោះ។',
      correctAnswer: '13',
      explanation: 'អង្កត់ផ្ចិតស្មើពីរដងនៃកាំ៖ $d = 2r = 2 \\times 6.5 = 13$ ។',
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
      explanation: 'រង្វាស់មុំចារឹកស្មើនឹងពាក់កណ្តាលមុំកណ្តាលដែលស្កាត់ធ្នូរួមគ្នា៖ $80^\\circ / 2 = 40^\\circ$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើមុំចារឹកក្នុងរង្វង់ដែលស្កាត់កន្លះរង្វង់ (អង្កត់ផ្ចិត) មានរង្វាស់ស្មើនឹងប៉ុន្មានដឺក្រេ?',
      options: ['45^\\circ', '60^\\circ', '90^\\circ', '180^\\circ'],
      correctAnswer: 2,
      explanation: 'ធ្នូកន្លះរង្វង់មានរង្វាស់ $180^\\circ$ នាំឱ្យមុំចារឹកស្មើ $180^\\circ / 2 = 90^\\circ$ (មុំកែង)។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងចតុកោណចារឹកក្នុងរង្វង់ $ABCD$ បើមុំ $\\angle A = 70^\\circ$ តើមុំទល់មុខ $\\angle C$ មានរង្វាស់ប៉ុន្មាន?',
      options: ['20^\\circ', '70^\\circ', '110^\\circ', '160^\\circ'],
      correctAnswer: 2,
      explanation: 'ផលបូកមុំទល់មុខនៃចតុកោណចារឹកក្នុងរង្វង់ស្មើ $180^\\circ \\implies \\angle C = 180^\\circ - 70^\\circ = 110^\\circ$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'មុំចារឹកក្នុងរង្វង់ដែលស្កាត់កន្លះរង្វង់ គឺជាមុំកែង ($90^\\circ$)។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ព្រោះវាស្កាត់ធ្នូដែលមានរង្វាស់ $180^\\circ$ នាំឱ្យមុំចារឹកស្មើ $180^\\circ / 2 = 90^\\circ$ (មុំកែង)។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'មុំចារឹកពីរក្នុងរង្វង់តែមួយ ដែលស្កាត់ធ្នូតែមួយ មានរង្វាស់ស្មើគ្នាជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'នេះជាទ្រឹស្ដីបទគ្រឹះនៃមុំចារឹកស្កាត់ធ្នូរួម។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងចតុកោណចារឹកក្នុងរង្វង់ $ABCD$ បើមុំ $\\angle B = 85^\\circ$ តើមុំទល់មុខ $\\angle D$ ស្មើប៉ុន្មានដឺក្រេ? (សរសេរតែតួលេខ)',
      correctAnswer: '95',
      explanation: '$\\angle D = 180^\\circ - 85^\\circ = 95^\\circ$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'មុំកណ្តាល $\\angle AOB = 130^\\circ$ ។ រក-រង្វាស់មុំចារឹក $\\angle ACB$ ដែលស្កាត់ធ្នូ $AB$ ជាមួយគ្នា (សរសេរតែតួលេខ)។',
      correctAnswer: '65',
      explanation: '$\\angle ACB = \\frac{130^\\circ}{2} = 65^\\circ$ ។',
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
        'មុំចារឹកស្កាត់កន្លះរង្វង់ (90°)'
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
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងត្រីកោណ $ABC$ ចំណុច $D$ និង $E$ ជាចំណុចកណ្តាលនៃជ្រុង $AB$ និង $AC$ រៀងគ្នា។ បើ $BC = 12$ តើ $DE$ ស្មើប៉ុន្មាន?',
      options: ['4', '6', '8', '12'],
      correctAnswer: 1,
      explanation: 'តាមទ្រឹស្ដីបទខ្សែមធ្យមត្រីកោណ $DE = \\frac{BC}{2} = \\frac{12}{2} = 6$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'ក្នុងត្រីកោណ $ABC$ មាន $DE // BC$។ បើ $AD = 2$, $DB = 4$ និង $AE = 3$ តើ $EC$ ស្មើប៉ុន្មាន?',
      options: ['5', '6', '7', '8'],
      correctAnswer: 1,
      explanation: '$\\frac{AD}{DB} = \\frac{AE}{EC} \\implies \\frac{2}{4} = \\frac{3}{EC} \\implies EC = 6$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'បើបន្ទាត់ស្របបីកាត់ខ្សែកាត់ពីរ វាកំណត់បានអង្កត់សមាមាត្រគ្នានៅលើខ្សែកាត់ទាំងនោះ។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'នេះជាទ្រឹស្ដីបទថាឡែសទូទៅសម្រាប់បន្ទាត់ស្រប។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'អង្កត់តភ្ជាប់ចំណុចកណ្តាលនៃពីរជ្រុងរបស់ត្រីកោណមួយ គឺស្របនឹងជ្រុងទីបី ហើយមានប្រវែងស្មើនឹងពាក់កណ្តាលជ្រុងទីបីនោះ។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'នេះជាទ្រឹស្ដីបទខ្សែមធ្យមត្រីកោណ ដែលជាករណីពិសេសនៃទ្រឹស្ដីបទថាឡែស។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងត្រីកោណ $ABC$ មាន $DE // BC$។ បើ $AD = 3$, $DB = 6$ និង $AE = 4$ គណនាប្រវែង $EC$។',
      correctAnswer: '8',
      explanation: '$\\frac{AD}{DB} = \\frac{AE}{EC} \\implies \\frac{3}{6} = \\frac{4}{EC} \\implies EC = 8$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ខ្សែមធ្យម $DE$ នៃត្រីកោណ $ABC$ មានប្រវែង $7.5\\text{ cm}$ ។ គណនាប្រវែងជ្រុងបាត $BC$ (សរសេរតែលេខ)។',
      correctAnswer: '15',
      explanation: '$BC = 2 \\times DE = 2 \\times 7.5 = 15$ ។',
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
        'BC = 10 (DE = 5)'
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
    {
      type: 'MULTIPLE_CHOICE',
      text: 'បើត្រីកោណពីរដូចគ្នាមានផលធៀបដូចគ្នា $k = 4$ តើផលធៀបក្រឡាផ្ទៃរបស់វាស្មើនឹងប៉ុន្មាន?',
      options: ['4', '8', '16', '64'],
      correctAnswer: 2,
      explanation: 'ផលធៀបក្រឡាផ្ទៃស្មើនឹងការេនៃផលធៀបដូចគ្នា៖ $k^2 = 4^2 = 16$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'បើត្រីកោណពីរដូចគ្នាមានផលធៀបដូចគ្នា $k = 3$ តើផលធៀបបរិមាត្ររបស់វាស្មើនឹងប៉ុន្មាន?',
      options: ['3', '6', '9', '27'],
      correctAnswer: 0,
      explanation: 'ផលធៀបបរិមាត្រស្មើនឹងផលធៀបដូចគ្នា $k = 3$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'គ្រប់ត្រីកោណសម័ង្សទាំងអស់ គឺជាត្រីកោណដូចគ្នាជានិច្ច។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ព្រោះត្រីកោណសម័ង្សទាំងអស់មានមុំក្នុងទាំងបីស្មើនឹង $60^\\circ$ ដូចគ្នា (ករណី ម.ម.ម)។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ក្នុងត្រីកោណដូចគ្នា $\\triangle ABC \\sim \\triangle DEF$ ប្រសិនបើជ្រុងត្រូវគ្នា $AB = 6$ និង $DE = 9$ រកផលធៀបដូចគ្នា $k = DE/AB$ ជាទសភាគ (ឧ. 2.5)។',
      correctAnswer: '1.5',
      explanation: '$k = \\frac{9}{6} = 1.5$ ។',
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
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើផលបូកមុំក្នុងនៃឆកោណ (៦ ជ្រុង) ស្មើនឹងប៉ុន្មានដឺក្រេ?',
      options: ['540^\\circ', '720^\\circ', '900^\\circ', '1080^\\circ'],
      correctAnswer: 1,
      explanation: '$(6-2) \\times 180^\\circ = 4 \\times 180^\\circ = 720^\\circ$ ។',
    },
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើរូបមន្តគណនាចំនួនអង្កត់ទ្រូងនៃពហុកោណមាន $n$ ជ្រុងគឺជានរណា?',
      options: [
        'n(n-1)/2',
        'n(n-2)/2',
        'n(n-3)/2',
        'n(n-3)'
      ],
      correctAnswer: 2,
      explanation: 'ចំនួនអង្កត់ទ្រូងពហុកោណគឺ $\\frac{n(n-3)}{2}$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'ពហុកោណនិយ័ត (Regular Polygon) គឺជាពហុកោណដែលមានជ្រុងទាំងអស់ស្មើគ្នា និងមុំក្នុងទាំងអស់ស្មើគ្នា។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'នេះជានិយមន័យពិតប្រាកដនៃពហុកោណនិយ័ត។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'គណនារង្វាស់មុំក្នុងនីមួយៗនៃឆកោណនិយ័ត (៦ ជ្រុង)។ (សរសេរតែតួលេខដឺក្រេ ឧ. 100)',
      correctAnswer: '120',
      explanation: '$\\frac{720^\\circ}{6} = 120^\\circ$ ។',
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
    {
      type: 'MULTIPLE_CHOICE',
      text: 'តើរូបមន្តមាឌបាល់ (ស្វែរ) ដែលមានកាំ $r$ គឺជានរណា?',
      options: [
        'V = 4\\pi r^2',
        'V = \\frac{4}{3}\\pi r^3',
        'V = \\frac{1}{3}\\pi r^2 h',
        'V = \\pi r^2 h'
      ],
      correctAnswer: 1,
      explanation: 'មាឌស្វែរគណនាតាមរូបមន្ត $V = \\frac{4}{3}\\pi r^3$ ។',
    },
    {
      type: 'TRUE_FALSE',
      text: 'មាឌកោណស្មើនឹងមួយភាគបីនៃមាឌស៊ីឡាំងដែលមានកាំបាត និងកម្ពស់ដូចគ្នា។',
      options: ['True', 'False'],
      correctAnswer: 'true',
      explanation: 'ព្រោះ $V_{\\text{cone}} = \\frac{1}{3}\\pi r^2 h$ ពិតមែន។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ប្រអប់មួយមានបណ្តោយ ៤ ទទឹង ៣ និងកម្ពស់ ២។ គណនាមាឌប្រអប់នោះ។',
      correctAnswer: '24',
      explanation: '$V = 4 \\times 3 \\times 2 = 24$ ។',
    },
    {
      type: 'SHORT_ANSWER',
      text: 'ស៊ីឡាំងមួយមានកាំបាត $r=3$ និងកម្ពស់ $h=5$។ គណនាមាឌស៊ីឡាំងនោះ (សរសេរតែមេគុណនៃ $\\pi$ ឧទាហរណ៍៖ 45)។',
      correctAnswer: '45',
      explanation: '$V = \\pi r^2 h = \\pi(3^2)(5) = 45\\pi$ ។',
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
                difficulty: row.difficulty,
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
        difficulty: q.difficulty,
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
