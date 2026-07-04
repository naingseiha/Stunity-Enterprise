/**
 * Seed: sample practice questions for the first grade-9 Math units, so the
 * Learn path has live content on dev/staging. One QUIZ post per unit
 * ("Practice: <unit>"), questions tagged with the unit's topicId and written
 * through prepareQuizQuestions — identical shape to a teacher-authored quiz,
 * so grading, reels, recall and Learn practice all just work.
 *
 * ⚠️ SAMPLE CONTENT for the pilot — replace/extend with curriculum-reviewed
 * questions before any production rollout.
 *
 * Safety: DRY-RUN by default (--apply to write). Idempotent: skips a unit
 * whose "Practice: <unit>" post already exists. Author: first ADMIN /
 * SUPER_ADMIN / TEACHER user found (override with --author <userId>).
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

type SeedQuestion = { text: string; options: string[]; correct: number; explanation?: string };

/** Unit name (must match seed-topics-math-g9.ts) → sample questions. */
const PRACTICE: Record<string, SeedQuestion[]> = {
  'ចំនួនអសនិទាន': [
    { text: 'តើ √49 ស្មើប៉ុន្មាន?', options: ['5', '6', '7', '8'], correct: 2, explanation: '7 × 7 = 49 ដូច្នេះ √49 = 7' },
    { text: 'តើ ∛27 ស្មើប៉ុន្មាន?', options: ['3', '9', '27', '81'], correct: 0, explanation: '3 × 3 × 3 = 27' },
    { text: 'តើ 2⁵ ស្មើប៉ុន្មាន?', options: ['10', '16', '25', '32'], correct: 3, explanation: '2×2×2×2×2 = 32' },
    { text: 'តើ √(16 × 9) ស្មើប៉ុន្មាន?', options: ['12', '25', '144', '7'], correct: 0, explanation: '√16 × √9 = 4 × 3 = 12' },
    { text: 'ចំនួន 4500 សរសេរជាទម្រង់វិទ្យាសាស្ត្រ គឺ?', options: ['4.5 × 10²', '4.5 × 10³', '45 × 10³', '0.45 × 10⁴'], correct: 1, explanation: '4500 = 4.5 × 1000 = 4.5 × 10³' },
    { text: 'តើ (−2)³ ស្មើប៉ុន្មាន?', options: ['−8', '−6', '6', '8'], correct: 0, explanation: '(−2)×(−2)×(−2) = −8' },
  ],
  'សមាមាត្រ': [
    { text: 'បើ a/b = c/d តើទំនាក់ទំនងណាពិត?', options: ['a + d = b + c', 'a × d = b × c', 'a × b = c × d', 'a − b = c − d'], correct: 1, explanation: 'ផលគុណឆ្លង៖ a × d = b × c' },
    { text: 'រកតម្លៃ x បើ x/4 = 9/12', options: ['2', '3', '4', '6'], correct: 1, explanation: '12x = 36 ⇒ x = 3' },
    { text: 'ក្នុងថ្នាក់មួយមានសិស្សប្រុស ១៥នាក់ និងស្រី ២០នាក់។ តើផលធៀបសិស្សប្រុសធៀបនឹងសិស្សសរុបគឺប៉ុន្មាន?', options: ['3/4', '3/7', '4/7', '3/5'], correct: 1, explanation: 'សិស្សសរុប = 35 ⇒ 15/35 = 3/7' },
    { text: 'បើ 5 kg នៃអង្ករតម្លៃ ២០ ដុល្លារ តើ ១២ kg តម្លៃប៉ុន្មានដុល្លារ?', options: ['40', '45', '48', '50'], correct: 2, explanation: '1 kg តម្លៃ 4 ដុល្លារ ⇒ 12 × 4 = 48 ដុល្លារ' },
    { text: 'បើ 3/x = 6/10 តើ x ស្មើប៉ុន្មាន?', options: ['4', '5', '6', '8'], correct: 1, explanation: '6x = 30 ⇒ x = 5' },
    { text: 'តើ 25% នៃ 80 ស្មើនឹងប៉ុន្មាន?', options: ['15', '20', '25', '40'], correct: 1, explanation: '(25/100) × 80 = 20' },
  ],
  'កន្សោមពីជគណិត': [
    { text: 'ពន្លាត (x + 2)(x − 3)', options: ['x² − x − 6', 'x² + x − 6', 'x² − 5x − 6', 'x² − x + 6'], correct: 0, explanation: 'x² − 3x + 2x − 6 = x² − x − 6' },
    { text: 'បំបែកជាផលគុណកត្តា: x² − 9', options: ['(x − 3)(x − 3)', '(x + 3)(x − 3)', '(x + 9)(x − 1)', 'x(x − 9)'], correct: 1, explanation: 'ផលដកការេ: a² − b² = (a+b)(a−b)' },
    { text: 'បំបែកជាផលគុណកត្តា: x² + 5x + 6', options: ['(x + 1)(x + 6)', '(x + 2)(x + 3)', '(x − 2)(x − 3)', '(x + 5)(x + 1)'], correct: 1, explanation: '2 × 3 = 6 និង 2 + 3 = 5' },
    { text: 'សម្រួល (2x² + 3x) − (x² − x)', options: ['x² + 2x', 'x² + 4x', '3x² + 2x', 'x² − 4x'], correct: 1, explanation: '2x² − x² = x² និង 3x − (−x) = 4x' },
    { text: 'តើដឺក្រេនៃពហុធា 3x³ + x − 7 គឺប៉ុន្មាន?', options: ['1', '2', '3', '7'], correct: 2, explanation: 'ដឺក្រេ = និទស្សន្តធំបំផុតរបស់ x' },
    { text: 'កត្តារួមនៃ 6x² + 9x គឺ?', options: ['3x', '6x', 'x²', '9'], correct: 0, explanation: '6x² + 9x = 3x(2x + 3)' },
  ],
  'សមីការដឺក្រេទី១មានមួយអញ្ញាត': [
    { text: 'ដោះស្រាយ: 2x + 3 = 11', options: ['x = 3', 'x = 4', 'x = 5', 'x = 7'], correct: 1, explanation: '2x = 8 ⇒ x = 4' },
    { text: 'ដោះស្រាយ: 5x − 7 = 3x + 5', options: ['x = 4', 'x = 5', 'x = 6', 'x = 12'], correct: 2, explanation: '2x = 12 ⇒ x = 6' },
    { text: 'ដោះស្រាយ: x/3 = 4', options: ['x = 7', 'x = 12', 'x = 4/3', 'x = 1'], correct: 1, explanation: 'x = 4 × 3 = 12' },
    { text: 'ដោះស្រាយ: 3(x − 2) = 9', options: ['x = 3', 'x = 5', 'x = 6', 'x = 11'], correct: 1, explanation: 'x − 2 = 3 ⇒ x = 5' },
    { text: 'ចំនួនមួយបូក 8 ស្មើ 15។ តើចំនួននោះគឺប៉ុន្មាន?', options: ['5', '6', '7', '23'], correct: 2, explanation: 'x + 8 = 15 ⇒ x = 7' },
    { text: 'ដោះស្រាយ: 7 = 2x − 1', options: ['x = 3', 'x = 4', 'x = 6', 'x = 8'], correct: 1, explanation: '2x = 8 ⇒ x = 4' },
  ],
  'វិសមីការដឺក្រេទី១មានមួយអញ្ញាត': [
    { text: 'ដោះស្រាយ: 2x − 1 < 5', options: ['x < 2', 'x < 3', 'x > 3', 'x < 6'], correct: 1, explanation: '2x < 6 ⇒ x < 3' },
    { text: 'ដោះស្រាយ: −3x ≤ 9', options: ['x ≤ −3', 'x ≤ 3', 'x ≥ −3', 'x ≥ 3'], correct: 2, explanation: 'ចែកនឹង −3 → ត្រឡប់ទិស: x ≥ −3' },
    { text: 'ដោះស្រាយ: x + 4 > 7', options: ['x > 3', 'x > 11', 'x < 3', 'x > −3'], correct: 0, explanation: 'x > 7 − 4 = 3' },
    { text: 'ដោះស្រាយ: 5 − x ≥ 2', options: ['x ≥ 3', 'x ≤ 3', 'x ≥ −3', 'x ≤ 7'], correct: 1, explanation: '−x ≥ −3 ⇒ x ≤ 3 (ត្រឡប់ទិស)' },
    { text: 'តើតម្លៃណាផ្ទៀងផ្ទាត់ x > 2?', options: ['0', '1', '2', '5'], correct: 3, explanation: '5 > 2 ពិត; 2 មិនធំជាង 2 ទេ' },
    { text: 'ដោះស្រាយ: 2(x − 1) < 8', options: ['x < 3', 'x < 4', 'x < 5', 'x > 5'], correct: 2, explanation: 'x − 1 < 4 ⇒ x < 5' },
  ],
  'បំណែងចែកប្រេកង់': [
    { text: 'តើប្រេកង់ (Frequency) នៃថ្នាក់មួយគឺជាអ្វី?', options: ['ផលបូកទិន្នន័យ', 'ចំនួនដងដែលទិន្នន័យធ្លាក់ក្នុងថ្នាក់នោះ', 'មធ្យមភាគនៃថ្នាក់', 'ផលដកទិន្នន័យ'], correct: 1, explanation: 'ប្រេកង់គឺចំនួនដង ឬចំនួនធាតុក្នុងថ្នាក់នីមួយៗ' },
    { text: 'បើប្រេកង់នៃថ្នាក់មួយគឺ 10 ហើយប្រេកង់សរុបគឺ 50 តើប្រេកង់ជាភាគរយស្មើប៉ុន្មាន?', options: ['10%', '15%', '20%', '25%'], correct: 2, explanation: '(10/50) × 100% = 20%' },
    { text: 'តើប្រេកង់កើននៃថ្នាក់ទី k គណនាដូចម្តេច?', options: ['ផលបូកប្រេកង់ពីថ្នាក់ទី១ដល់ថ្នាក់ទី k', 'ផលដកប្រេកង់', 'ប្រេកង់ថ្នាក់ទី k ចែកនឹងសរុប', 'ប្រេកង់ថ្នាក់ចុងក្រោយ'], correct: 0, explanation: 'ប្រេកង់កើនជាផលបូកប្រេកង់រហូតដល់ថ្នាក់នោះ' },
    { text: 'ចំណុចប្រសព្វរវាងខ្សែខ្សែកោងប្រេកង់កើន និងប្រេកង់ថយ (Ogive) ផ្តល់នូវតម្លៃអ្វីលើអ័ក្សអាប់ស៊ីស?', options: ['មធ្យមភាគ', 'ម៉ូដ', 'មេដ្យាន', 'វិសាលភាព'], correct: 2, explanation: 'អាប់ស៊ីសនៃចំណុចប្រសព្វប្រហែលជាតម្លៃមេដ្យាន' },
    { text: 'ក្នុងតារាងបំណែងចែកប្រេកង់ តើផលបូកនៃប្រេកង់ទាំងអស់ស្មើនឹងអ្វី?', options: ['100', 'ចំនួនទិន្នន័យសរុប (n)', 'មធ្យមភាគ', '1'], correct: 1, explanation: 'ផលបូកប្រេកង់ស្មើនឹងចំនួនទិន្នន័យសរុប n' },
    { text: 'តើប្រេកង់ថយនៃថ្នាក់ដំបូងគេស្មើនឹងប៉ុន្មាន?', options: ['0', 'ប្រេកង់នៃថ្នាក់ដំបូង', 'ចំនួនទិន្នន័យសរុប', '100%'], correct: 2, explanation: 'ប្រេកង់ថយចាប់ផ្តើមពីចំនួនទិន្នន័យសរុប' },
  ],
  'ស្ថិតិ': [
    { text: 'មធ្យមភាគនៃ 4, 6, 8 គឺ?', options: ['5', '6', '7', '18'], correct: 1, explanation: '(4+6+8)/3 = 18/3 = 6' },
    { text: 'មេដ្យាននៃ 3, 5, 7, 9, 11 គឺ?', options: ['5', '6', '7', '9'], correct: 2, explanation: 'តម្លៃកណ្តាល (ទី៣) គឺ 7' },
    { text: 'ម៉ូដនៃ 2, 3, 3, 5, 7 គឺ?', options: ['2', '3', '5', '7'], correct: 1, explanation: '3 កើតឡើង ២ ដង ច្រើនជាងគេ' },
    { text: 'វិសាលភាពនៃ 2, 5, 8, 10 គឺ?', options: ['6', '8', '10', '12'], correct: 1, explanation: '10 − 2 = 8' },
    { text: 'មធ្យមភាគនៃ 5, 5, 5, 5 គឺ?', options: ['0', '4', '5', '20'], correct: 2, explanation: 'ទិន្នន័យដូចគ្នាទាំងអស់ → មធ្យម = 5' },
    { text: 'មេដ្យាននៃ 2, 4, 6, 8 គឺ?', options: ['4', '5', '6', '7'], correct: 1, explanation: 'ចំនួនគូ → (4+6)/2 = 5' },
  ],
  'ប្រូបាប': [
    { text: 'ពេលបោះកាក់មួយ តើប្រូបាប៊ីលីតេក្នុងការចេញមុខក្បាលស្មើប៉ុន្មាន?', options: ['0', '1/4', '1/2', '1'], correct: 2, explanation: 'ករណីស្រប 1 លើករណីអាច 2 ⇒ P = 1/2' },
    { text: 'ពេលទម្លាក់គ្រាប់ឡុកឡាក់មួយ (មុខ ១ ដល់ ៦) តើប្រូបាបក្នុងការចេញលេខគូស្មើប៉ុន្មាន?', options: ['1/6', '1/3', '1/2', '2/3'], correct: 2, explanation: 'លេខគូមាន 2, 4, 6 (៣ករណី) ⇒ 3/6 = 1/2' },
    { text: 'បើ P(A) = 0.3 តើប្រូបាបនៃព្រឹត្តិការណ៍បំពេញ P(A′) ស្មើប៉ុន្មាន?', options: ['0.3', '0.5', '0.7', '1.0'], correct: 2, explanation: 'P(A′) = 1 − P(A) = 1 − 0.3 = 0.7' },
    { text: 'តើប្រូបាប៊ីលីតេនៃព្រឹត្តិការណ៍ដែលមិនអាចកើតឡើងសោះ (Impossible event) ស្មើប៉ុន្មាន?', options: ['−1', '0', '0.5', '1'], correct: 1, explanation: 'ព្រឹត្តិការណ៍មិនអាចកើតឡើងមានប្រូបាបស្មើ 0' },
    { text: 'ក្នុងថង់មួយមានបាល់ក្រហម ៣ និងបាល់ខៀវ ២។ ចាប់យកបាល់មួយដោយចៃដន្យ តើប្រូបាបបានបាល់ក្រហមស្មើប៉ុន្មាន?', options: ['2/5', '3/5', '1/3', '1/2'], correct: 1, explanation: 'បាល់ក្រហម ៣ លើបាល់សរុប ៥ ⇒ 3/5' },
    { text: 'ពេលបោះកាក់ពីរក្នុងពេលតែមួយ តើចំនួនករណីអាចទាំងអស់មានប៉ុន្មាន?', options: ['2', '3', '4', '6'], correct: 2, explanation: '2 × 2 = 4 ករណី (HH, HT, TH, TT)' },
  ],
  'ចម្ងាយរវាងពីរចំណុច': [
    { text: 'តើចម្ងាយរវាងចំណុច A(0, 0) និង B(3, 4) ស្មើប៉ុន្មាន?', options: ['5', '6', '7', '8'], correct: 0, explanation: 'd = √(3² + 4²) = √25 = 5' },
    { text: 'តើកូអរដោនេចំណុចកណ្តាល M នៃ A(2, 4) និង B(6, 8) គឺ?', options: ['(3, 5)', '(4, 6)', '(8, 12)', '(2, 2)'], correct: 1, explanation: 'M((2+6)/2, (4+8)/2) = (4, 6)' },
    { text: 'ចម្ងាយរវាង A(1, 2) និង B(1, 7) ស្មើប៉ុន្មាន?', options: ['3', '4', '5', '9'], correct: 2, explanation: 'ដកកូអរដោនេ y៖ 7 − 2 = 5' },
    { text: 'រូបមន្តចម្ងាយរវាងពីរចំណុច AB គឺ?', options: ['√((x₂−x₁)² + (y₂−y₁)²)', '√((x₂+x₁)² + (y₂+y₁)²)', '(x₂−x₁) + (y₂−y₁)', '((x₁+x₂)/2, (y₁+y₂)/2)'], correct: 0, explanation: 'មកពីទ្រឹស្ដីបទពីតាករលើប្លង់កូអរដោនេ' },
    { text: 'បើចំណុច M(3, 3) ជាចំណុចកណ្តាលនៃ A(1, 1) និង B(x, y) តើ B មានកូអរដោនេប៉ុន្មាន?', options: ['(4, 4)', '(5, 5)', '(6, 6)', '(2, 2)'], correct: 1, explanation: '(1+x)/2 = 3 ⇒ x = 5, (1+y)/2 = 3 ⇒ y = 5' },
    { text: 'តើត្រីកោណ ABC ដែលមាន AB=3, BC=4, AC=5 ជាត្រីកោណអ្វី?', options: ['ត្រីកោណសម័ង្ស', 'ត្រីកោណកែងត្រង់ B', 'ត្រីកោណកែងត្រង់ A', 'ត្រីកោណសមបាត'], correct: 1, explanation: '3² + 4² = 5² ដូច្នេះជាត្រីកោណកែងត្រង់ B' },
  ],
  'សមីការនៃបន្ទាត់': [
    { text: 'មេគុណប្រាប់ទិសនៃ y = 3x − 2 គឺ?', options: ['−2', '2', '3', 'x'], correct: 2, explanation: 'ក្នុង y = ax + b មេគុណប្រាប់ទិសគឺ a = 3' },
    { text: 'បន្ទាត់ y = 2x + 5 កាត់អ័ក្ស y ត្រង់?', options: ['2', '5', '−5', '0'], correct: 1, explanation: 'b = 5 ជាចំណុចកាត់អ័ក្ស y' },
    { text: 'បើ f(x) = 2x + 1 តើ f(3) ស្មើប៉ុន្មាន?', options: ['5', '6', '7', '9'], correct: 2, explanation: 'f(3) = 2(3) + 1 = 7' },
    { text: 'តើចំណុច (1, 4) ស្ថិតលើបន្ទាត់ y = 3x + 1 ដែរឬទេ?', options: ['ស្ថិតលើ', 'មិនស្ថិតលើ', 'មិនអាចដឹង', 'ស្ថិតលើអ័ក្ស x'], correct: 0, explanation: '3(1) + 1 = 4 ✓' },
    { text: 'មេគុណប្រាប់ទិសនៃបន្ទាត់ឆ្លងកាត់ (0,0) និង (2,6) គឺ?', options: ['2', '3', '4', '6'], correct: 1, explanation: 'a = (6−0)/(2−0) = 3' },
    { text: 'បន្ទាត់ y = −x + 2 មានមេគុណប្រាប់ទិស?', options: ['1', '2', '−1', '−2'], correct: 2, explanation: 'a = −1 (បន្ទាត់ចុះ)' },
  ],
  'ប្រព័ន្ធសមីការដឺក្រេទី១មានពីរអញ្ញាត': [
    { text: 'ដោះស្រាយ: x + y = 5 និង x − y = 1', options: ['(3, 2)', '(2, 3)', '(4, 1)', '(1, 4)'], correct: 0, explanation: 'បូកសមីការ: 2x = 6 ⇒ x = 3, y = 2' },
    { text: 'ដោះស្រាយ: 2x + y = 7 និង y = x + 1', options: ['(1, 2)', '(2, 3)', '(3, 4)', '(2, 5)'], correct: 1, explanation: 'ជំនួស: 2x + x + 1 = 7 ⇒ x = 2, y = 3' },
    { text: 'បើ x + 2y = 8 ហើយ x = 2 តើ y ស្មើប៉ុន្មាន?', options: ['2', '3', '4', '6'], correct: 1, explanation: '2 + 2y = 8 ⇒ 2y = 6 ⇒ y = 3' },
    { text: 'ដោះស្រាយ: 3x + y = 9 និង x + y = 5', options: ['(2, 3)', '(3, 2)', '(1, 4)', '(4, 1)'], correct: 0, explanation: 'ដក: 2x = 4 ⇒ x = 2, y = 3' },
    { text: 'ចំនួនពីរបូកគ្នាស្មើ 12 ដកគ្នាស្មើ 4។ ចំនួនធំគឺ?', options: ['6', '7', '8', '10'], correct: 2, explanation: '2x = 16 ⇒ x = 8 (និង 4)' },
    { text: 'តើគូ (x, y) ណាផ្ទៀងផ្ទាត់ x + y = 6 និង x − y = 2?', options: ['(4, 2)', '(2, 4)', '(5, 1)', '(3, 3)'], correct: 0, explanation: '4 + 2 = 6 ✓ និង 4 − 2 = 2 ✓' },
  ],
  'ទ្រឹស្ដីបទពីតាករ': [
    { text: 'ជ្រុងកែង 3 និង 4។ អ៊ីប៉ូតេនុសស្មើ?', options: ['5', '6', '7', '12'], correct: 0, explanation: '√(9+16) = √25 = 5' },
    { text: 'អ៊ីប៉ូតេនុស 13 ជ្រុងកែងមួយ 5។ ជ្រុងទៀតស្មើ?', options: ['8', '10', '12', '18'], correct: 2, explanation: '√(169−25) = √144 = 12' },
    { text: 'ជ្រុងកែង 6 និង 8។ អ៊ីប៉ូតេនុសស្មើ?', options: ['9', '10', '12', '14'], correct: 1, explanation: '√(36+64) = √100 = 10' },
    { text: 'តើ 5, 12, 13 ជាត្រីកោណកែងដែរឬទេ?', options: ['ជា', 'មិនជា', 'មិនអាចដឹង', 'ជាត្រីកោណសម័ង្ស'], correct: 0, explanation: '25 + 144 = 169 = 13² ✓' },
    { text: 'អ៊ីប៉ូតេនុស 10 ជ្រុងកែងមួយ 6។ ជ្រុងទៀតស្មើ?', options: ['4', '6', '8', '16'], correct: 2, explanation: '√(100−36) = √64 = 8' },
    { text: 'ជ្រុងកែង 9 និង 12។ អ៊ីប៉ូតេនុសស្មើ?', options: ['13', '15', '18', '21'], correct: 1, explanation: '√(81+144) = √225 = 15' },
  ],
  'រង្វង់និងបន្ទាត់': [
    { text: 'រង្វង់កាំ r = 7។ បរិមាត្រស្មើ?', options: ['7π', '14π', '49π', '21π'], correct: 1, explanation: 'C = 2πr = 14π' },
    { text: 'ថាសកាំ r = 3។ ក្រឡាផ្ទៃស្មើ?', options: ['3π', '6π', '9π', '12π'], correct: 2, explanation: 'A = πr² = 9π' },
    { text: 'អង្កត់ផ្ចិត d = 10។ កាំស្មើ?', options: ['5', '10', '20', '25'], correct: 0, explanation: 'r = d/2 = 5' },
    { text: 'បើ C = 6π តើកាំស្មើ?', options: ['2', '3', '6', '12'], correct: 1, explanation: '2πr = 6π ⇒ r = 3' },
    { text: 'បើ A = 25π តើកាំស្មើ?', options: ['5', '12.5', '25', '625'], correct: 0, explanation: 'r² = 25 ⇒ r = 5' },
    { text: 'កន្លះថាសកាំ r = 2 មានក្រឡាផ្ទៃ?', options: ['π', '2π', '4π', '8π'], correct: 1, explanation: 'πr²/2 = 4π/2 = 2π' },
  ],
  'មុំកណ្តាលនិងមុំចារឹកក្នុងរង្វង់': [
    { text: 'បើមុំកណ្តាល ∠AOB = 80° តើមុំចារឹក ∠ACB ដែលស្កាត់ធ្នូ AB ជាមួយគ្នាស្មើប៉ុន្មាន?', options: ['40°', '80°', '160°', '20°'], correct: 0, explanation: 'មុំចារឹកស្មើពាក់កណ្តាលមុំកណ្តាល៖ 80° / 2 = 40°' },
    { text: 'តើមុំចារឹកក្នុងរង្វង់ដែលស្កាត់កន្លះរង្វង់ (អង្កត់ផ្ចិត) មានរង្វាស់ប៉ុន្មានដឺក្រេ?', options: ['45°', '60°', '90°', '180°'], correct: 2, explanation: 'មុំចារឹកស្កាត់កន្លះរង្វង់ជាមុំកែង (90°)' },
    { text: 'ក្នុងចតុកោណចារឹកក្នុងរង្វង់ ABCD បើមុំ ∠A = 70° តើមុំទល់មុខ ∠C ស្មើប៉ុន្មាន?', options: ['70°', '90°', '110°', '180°'], correct: 2, explanation: 'ផលបូកមុំទល់មុខស្មើ 180° ⇒ ∠C = 180° − 70° = 110°' },
    { text: 'មុំចារឹកក្នុងរង្វង់ពីរ ឬច្រើនដែលស្កាត់ធ្នូតែមួយ មានរង្វាស់ដូចម្តេច?', options: ['ស្មើគ្នា', 'បូកគ្នាបាន 90°', 'បូកគ្នាបាន 180°', 'ខុសគ្នា'], correct: 0, explanation: 'មុំចារឹកស្កាត់ធ្នូដូចគ្នា មានរង្វាស់ស្មើគ្នាជានិច្ច' },
    { text: 'បើមុំចារឹក ∠AMB = 35° តើធ្នូ AB មានរង្វាស់ប៉ុន្មានដឺក្រេ?', options: ['35°', '70°', '17.5°', '140°'], correct: 1, explanation: 'រង្វាស់ធ្នូស្មើពីរដងមុំចារឹក៖ 35° × 2 = 70°' },
    { text: 'មុំដែលមានកំពូលនៅក្រៅរង្វង់ បង្កើតដោយខ្សែកាត់ពីរ ស្មើនឹងអ្វី?', options: ['ពាក់កណ្តាលផលបូកធ្នូ', 'ពាក់កណ្តាលផលដកធ្នូ', 'ផលបូកធ្នូ', 'ផលដកធ្នូ'], correct: 1, explanation: 'មុំក្រៅរង្វង់ = (ធ្នូធំ − ធ្នូតូច) / 2' },
  ],
  'ទ្រឹស្ដីបទថាឡែស': [
    { text: 'ក្នុង △ABC បើ DE // BC (D លើ AB, E លើ AC) តើសមាមាត្រណាពិត?', options: ['AD/DB = AE/EC', 'AD/AB = EC/AC', 'DB/AD = AC/AE', 'AD/EC = AE/DB'], correct: 0, explanation: 'តាមទ្រឹស្ដីបទថាឡែស៖ AD/DB = AE/EC' },
    { text: 'ក្នុង △ABC មាន DE // BC។ បើ AD=2, DB=4, AE=3 តើ EC ស្មើប៉ុន្មាន?', options: ['4', '5', '6', '8'], correct: 2, explanation: '2/4 = 3/EC ⇒ EC = 6' },
    { text: 'បើបន្ទាត់ស្របបីកាត់ខ្សែកាត់ពីរ តើវាកំណត់បានអង្កត់ដូចម្តេចលើខ្សែកាត់ទាំងនោះ?', options: ['ស្មើគ្នា', 'សមាមាត្រគ្នា', 'កែងគ្នា', 'ស្របគ្នា'], correct: 1, explanation: 'អង្កត់ត្រួតគ្នាលើខ្សែកាត់ទាំងពីរមានសមាមាត្រគ្នា' },
    { text: 'ក្នុង △ABC បើ D និង E ជាចំណុចកណ្តាលនៃ AB និង AC តើ DE មានទំនាក់ទំនងដូចម្តេចនឹង BC?', options: ['DE ⊥ BC', 'DE // BC និង DE = BC/2', 'DE = BC', 'DE // BC និង DE = 2BC'], correct: 1, explanation: 'ចំណុចកណ្តាលជ្រុងពីរភ្ជាប់គ្នាស្របនឹងជ្រុងទី៣ ហើយស្មើពាក់កណ្តាល' },
    { text: 'ក្នុង △PQR មាន ST // QR។ បើ PS/PQ = 1/3 ហើយ PT = 4 តើ PR ស្មើប៉ុន្មាន?', options: ['8', '10', '12', '16'], correct: 2, explanation: 'PT/PR = PS/PQ = 1/3 ⇒ 4/PR = 1/3 ⇒ PR = 12' },
    { text: 'តើទ្រឹស្ដីបទថាឡែសច្រាសប្រើសម្រាប់បញ្ជាក់អ្វី?', options: ['ការេនៃជ្រុង', 'មុំកែង', 'ភាពស្របគ្នានៃបន្ទាត់', 'ក្រឡាផ្ទៃ'], correct: 2, explanation: 'បើសមាមាត្រស្មើគ្នា នោះបន្ទាត់ទាំងពីរស្របគ្នា' },
  ],
  'ត្រីកោណប៉ុនគ្នា': [
    { text: 'តើករណីណាខាងក្រោមដែលមិនមែនជាលក្ខខណ្ឌនៃត្រីកោណទូទៅប៉ុនគ្នា?', options: ['ជ.ម.ជ (SAS)', 'ម.ជ.ម (ASA)', 'ជ.ជ.ជ (SSS)', 'ម.ម.ម (AAA)'], correct: 3, explanation: 'ម.ម.ម (AAA) បញ្ជាក់ត្រឹមតែត្រីកោណដូចគ្នា មិនអាចបញ្ជាក់ថាប៉ុនគ្នាឡើយ' },
    { text: 'ក្នុងត្រីកោណកែងពីរ បើមានអ៊ីប៉ូតេនុស និងមុំស្រួចមួយស្មើគ្នារៀងគ្នា តើវាប៉ុនគ្នាតាមករណីណា?', options: ['អ.ម', 'អ.ជ', 'ជ.ម.ជ', 'ម.ជ.ម'], correct: 0, explanation: 'ករណី អ៊ីប៉ូតេនុស-មុំស្រួច (អ.ម)' },
    { text: 'បើ △ABC ≅ △A′B′C′ តើជ្រុងណាស្មើនឹង BC?', options: ['A′B′', 'B′C′', 'A′C′', 'AB'], correct: 1, explanation: 'ធាតុរៀងគ្នាស្មើគ្នា៖ BC = B′C′' },
    { text: 'តើត្រីកោណពីរដែលមានជ្រុងទាំងបីស្មើគ្នារៀងគ្នា ជាត្រីកោណប៉ុនគ្នាតាមករណីណា?', options: ['ជ.ម.ជ', 'ម.ជ.ម', 'ជ.ជ.ជ', 'អ.ជ'], correct: 2, explanation: 'ករណី ជ្រុង-ជ្រុង-ជ្រុង (ជ.ជ.ជ)' },
    { text: 'បើ △ABC ≅ △DEF ហើយ AB = 5cm, BC = 7cm, AC = 6cm តើ EF មានប្រវែងប៉ុន្មាន?', options: ['5 cm', '6 cm', '7 cm', '18 cm'], correct: 2, explanation: 'EF ត្រូវគ្នានឹង BC ដូច្នេះ EF = BC = 7 cm' },
    { text: 'ក្នុងត្រីកោណកែងពីរ បើមានអ៊ីប៉ូតេនុស និងជ្រុងកែងមួយស្មើគ្នារៀងគ្នា តើវាប៉ុនគ្នាតាមករណីណា?', options: ['អ.ជ', 'អ.ម', 'ជ.ជ.ជ', 'ម.ជ.ម'], correct: 0, explanation: 'ករណី អ៊ីប៉ូតេនុស-ជ្រុងកែង (អ.ជ)' },
  ],
  'ពហុកោណ': [
    { text: 'តើផលបូកមុំក្នុងនៃត្រីកោណ (៣ ជ្រុង) ស្មើប៉ុន្មានដឺក្រេ?', options: ['90°', '180°', '270°', '360°'], correct: 1, explanation: '(3 − 2) × 180° = 180°' },
    { text: 'តើផលបូកមុំក្នុងនៃចតុកោណ (៤ ជ្រុង) ស្មើប៉ុន្មានដឺក្រេ?', options: ['180°', '360°', '540°', '720°'], correct: 1, explanation: '(4 − 2) × 180° = 360°' },
    { text: 'តើផលបូកមុំក្រៅនៃពហុកោណណាមួយស្មើប៉ុន្មានដឺក្រេជានិច្ច?', options: ['180°', '360°', '540°', '720°'], correct: 1, explanation: 'ផលបូកមុំក្រៅពហុកោណតែងតែស្មើ 360° មិនថាមានប៉ុន្មានជ្រុងឡើយ' },
    { text: 'តើមុំក្នុងនីមួយៗនៃឆកោណនិយ័ត (៦ ជ្រុងស្មើ) មានរង្វាស់ប៉ុន្មាន?', options: ['108°', '120°', '135°', '150°'], correct: 1, explanation: '(6 − 2) × 180° / 6 = 720° / 6 = 120°' },
    { text: 'តើពហុកោណ ៥ ជ្រុង (បញ្ចកោណ) មានអង្កត់ទ្រូងចំនួនប៉ុន្មាន?', options: ['3', '5', '7', '10'], correct: 1, explanation: 'n(n−3)/2 = 5(2)/2 = 5 អង្កត់ទ្រូង' },
    { text: 'តើមុំក្រៅនីមួយៗនៃបញ្ចកោណនិយ័ត (៥ ជ្រុង) ស្មើប៉ុន្មាន?', options: ['60°', '72°', '90°', '108°'], correct: 1, explanation: '360° / 5 = 72°' },
  ],
  'សូលីត': [
    { text: 'គូបជ្រុង a = 3។ មាឌស្មើ?', options: ['9', '18', '27', '81'], correct: 2, explanation: 'V = a³ = 27' },
    { text: 'ប្រអប់ 2 × 3 × 4។ មាឌស្មើ?', options: ['9', '20', '24', '30'], correct: 2, explanation: 'V = lwh = 24' },
    { text: 'ស៊ីឡាំង r = 2, h = 5។ មាឌស្មើ?', options: ['10π', '20π', '25π', '40π'], correct: 1, explanation: 'V = πr²h = 20π' },
    { text: 'កោណ r = 3, h = 4។ មាឌស្មើ?', options: ['12π', '36π', '9π', '18π'], correct: 0, explanation: 'V = (1/3)πr²h = 12π' },
    { text: 'ស្វ៊ែរកាំ r = 3។ មាឌស្មើ?', options: ['12π', '27π', '36π', '108π'], correct: 2, explanation: 'V = (4/3)π(27) = 36π' },
    { text: 'គូបមានមាឌ 64។ ជ្រុងស្មើ?', options: ['4', '8', '16', '32'], correct: 0, explanation: 'a = ∛64 = 4' },
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
  'ត្រីកោណប៉ុនគ្នា': ['Similar Triangles'],
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
      if (existing.title !== title || unitName === 'ត្រីកោណប៉ុនគ្នា') {
        console.log(`  ✏️  updating "${existing.title}" -> "${title}" (${existing.id})`);
        if (APPLY) {
          const prepared = prepareQuizQuestions(
            seedQuestions.map((q) => ({
              text: q.text,
              type: 'MULTIPLE_CHOICE',
              options: q.options,
              correctAnswer: q.correct,
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
            if (quiz && unitName === 'ត្រីកោណប៉ុនគ្នា') {
              await tx.quiz.update({
                where: { id: quiz.id },
                data: {
                  questions: prepared.questionsJson as any,
                  totalPoints: prepared.questionsJson.reduce((sum, q) => sum + q.points, 0),
                },
              });
              await tx.quizQuestion.deleteMany({ where: { postId: existing.id } });
              await tx.quizQuestion.createMany({
                data: prepared.rows.map(({ action, ...row }) => ({ ...row, postId: existing.id })),
              });
            }
          });
        }
        createdPosts += 1;
      } else {
        console.log(`  ⏭️  "${title}" already exists (${existing.id})`);
        skipped += 1;
      }
      continue;
    }

    const prepared = prepareQuizQuestions(
      seedQuestions.map((q) => ({
        text: q.text,
        type: 'MULTIPLE_CHOICE',
        options: q.options,
        correctAnswer: q.correct,
        points: 1,
        explanation: q.explanation,
        topicId: topic.id,
      })),
      { validTopicIds: new Set([topic.id]) },
    );

    console.log(`  ➕ "${title}" — ${prepared.rows.length} questions → topic ${topic.id}`);
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
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${createdPosts} practice posts, ${skipped} skipped.`,
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
