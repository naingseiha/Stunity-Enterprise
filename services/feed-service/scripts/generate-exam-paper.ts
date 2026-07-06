/**
 * AI-generate a realistic past-exam-paper-style Quiz for a subject.
 *
 * Real scanned past exam papers aren't available to source from (confirmed
 * with the user), so this generates a NEW paper that follows the authentic
 * Cambodian Bac II / national-exam FORMAT (section structure, per-question
 * point weighting, time limit) established by the hand-authored papers in
 * `seed-exams-math-g12.ts` — same downstream shape (Post with courseCode/
 * examDate/examDuration/examTotalPoints/examPassingScore + row-backed
 * QuizQuestions with topicId+difficulty), just AI-drafted content instead of
 * hand-authored. Uses Claude directly (same pattern as
 * classify-question-difficulty.ts) — this project's own prior A/B testing
 * already found Claude meaningfully more reliable than Gemini for Khmer-
 * language math content, so there's no reason to relitigate that choice here.
 *
 * Safety:
 *   - DRY-RUN by default. Pass --apply to write.
 *   - The full generated paper is always printed for review before any write.
 *   - --apply refuses to run without a prior dry-run in the same invocation
 *     (there is no separate "confirm" step — re-run with --apply once the
 *     printed dry-run has been reviewed).
 *   - Each question is validated against the subject's real topic catalog;
 *     any unitName that doesn't match a real topic is DROPPED, never guessed.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/generate-exam-paper.ts --subjectCode MATH-G12-SCIENCE --year 2025
 *   node ../../node_modules/.bin/tsx scripts/generate-exam-paper.ts --subjectCode MATH-G12-SCIENCE --year 2025 --apply
 */

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { prepareQuizQuestions } from '../src/utils/quizQuestionRows';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../ai-service/.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const AUTHOR_OVERRIDE = process.env.SEED_AUTHOR_ID || null;
const MODEL = 'claude-sonnet-5';

const argValue = (flag: string): string | null => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};

const SUBJECT_CODE = argValue('--subjectCode');
const YEAR = argValue('--year') ? parseInt(argValue('--year')!, 10) : null;

// Real Bac II format, established by the hand-authored papers in
// seed-exams-math-g12.ts. Falls back to a generic structure for any other
// subject/grade this script gets pointed at later.
type ExamFormat = { timeLimit: number; totalTargetPoints: number; passingScore: number; questionCount: number };
const TRACK_FORMATS: Record<string, ExamFormat> = {
  'MATH-G12-SCIENCE': { timeLimit: 150, totalTargetPoints: 125, passingScore: 63, questionCount: 8 },
  'MATH-G12-SOCIAL': { timeLimit: 120, totalTargetPoints: 75, passingScore: 38, questionCount: 7 },
};
const DEFAULT_FORMAT: ExamFormat = { timeLimit: 120, totalTargetPoints: 100, passingScore: 50, questionCount: 8 };

type GeneratedQuestion = {
  unitName: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_BLANK' | 'ORDERING' | 'MATCHING';
  options?: string[];
  correctAnswer: any;
  points: number;
  explanation: string;
  difficulty: number;
};

const SYSTEM_PROMPT = `You are drafting one full mock national exam paper (Cambodian Bac II / national exam style) for a
Khmer-curriculum math subject. You will be given the exact list of real curriculum unit names for this subject/track,
the real exam format (time limit, total points, number of questions, passing score), and 1-2 real past papers as style
references (format only — do NOT reuse their exact questions).

RULES:
- Output ONLY a JSON array of questions, no markdown fences, no extra text.
- Each entry: {"unitName": "<must exactly match one of the given unit names>", "text": "<question, Khmer, LaTeX in $...$>",
  "type": "MULTIPLE_CHOICE"|"TRUE_FALSE"|"SHORT_ANSWER"|"FILL_IN_BLANK"|"ORDERING"|"MATCHING",
  "options": [...] (omit for SHORT_ANSWER/FILL_IN_BLANK), "correctAnswer": ..., "points": <integer>,
  "explanation": "<full worked solution, Khmer, LaTeX in $...$>", "difficulty": <1-5 integer>}
- Cover a SPREAD of the given units (do not repeat one unit twice unless the unit list is shorter than the question count).
- Points per question must sum to exactly the given totalTargetPoints.
- Mix question types like the reference papers do — not all MULTIPLE_CHOICE.
- Difficulty should mostly be 3-5 (this is exam-level content, not basic practice) — do not default everything to 1-2.
- CRITICAL: never place Khmer characters inside a LaTeX \\text{} command — KaTeX has no Khmer glyphs there and it will
  render as broken boxes. Use English abbreviations inside \\text{} if needed, put Khmer labels outside the math.
- Every explanation must be a complete, mathematically correct worked solution — this is real exam-prep content,
  not filler.

CRITICAL — correctAnswer format per type (the app grades by exact/normalized string match, not by meaning, so
getting this format wrong silently marks a correct student answer as wrong):
- MULTIPLE_CHOICE: correctAnswer must be the exact text of the correct entry in "options" (character-for-character,
  including any $...$ — it's matched against the options array).
- TRUE_FALSE: correctAnswer must be the literal English string "TRUE" or "FALSE" — never a translated/Khmer word
  like "ពិត"/"មិនពិត". options must be exactly ["TRUE", "FALSE"].
- SHORT_ANSWER / FILL_IN_BLANK: correctAnswer must be PLAIN TEXT ONLY — no "$" delimiters, no LaTeX commands
  (no \\dfrac, \\ln, etc.) — because the student types their answer into a plain text box, not a LaTeX editor, and
  grading is an exact (case-insensitive, trimmed) string match against whatever they typed. Use the simplest plain
  form a student would actually type: a bare number ("1"), a simple expression using plain characters ("y=3e^(2x)",
  not "$y=3e^{2x}$"), or a short plain word. If the true answer can't be typed unambiguously as plain text, prefer
  MULTIPLE_CHOICE instead for that question.
- ORDERING: correctAnswer is the ascending index array [0,1,2,...] (options must already be listed in the correct
  final order — the app shuffles them for display itself).
- MATCHING: correctAnswer is not used for grading (grading derives correct pairs from "left:::right" entries in
  options), but still include a correctAnswer object mapping left→right for completeness.`;

function buildUserPrompt(
  subjectLabel: string,
  format: ExamFormat,
  unitNames: string[],
  referencePapers: Array<{ title: string; timeLimit: number; questions: Array<{ text: string; type: string; points: number }> }>,
): string {
  return JSON.stringify({
    subject: subjectLabel,
    format,
    availableUnits: unitNames,
    referencePapers: referencePapers.map((p) => ({
      title: p.title,
      timeLimit: p.timeLimit,
      questionShapes: p.questions.map((q) => ({ type: q.type, points: q.points })),
    })),
  });
}

const parseJsonArray = (raw: string): GeneratedQuestion[] => {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('model did not return an array');
  return parsed;
};

async function generate() {
  console.log(`🤖 Exam-paper generation — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  if (!SUBJECT_CODE) throw new Error('--subjectCode is required (e.g. MATH-G12-SCIENCE)');
  if (!YEAR) throw new Error('--year is required (e.g. --year 2025)');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey });

  const subject = await prisma.subject.findUnique({ where: { code: SUBJECT_CODE } });
  if (!subject) throw new Error(`Subject ${SUBJECT_CODE} not found — seed its topics first`);

  const topics = await prisma.topic.findMany({
    where: { subjectId: subject.id, parentId: null, isActive: true },
    select: { id: true, name: true, nameKh: true },
  });
  if (topics.length === 0) throw new Error(`No units found for ${SUBJECT_CODE} — seed its topics first`);
  const topicMap = new Map<string, string>();
  for (const t of topics) {
    topicMap.set(t.name, t.id);
    if (t.nameKh) topicMap.set(t.nameKh, t.id);
  }

  const format = TRACK_FORMATS[SUBJECT_CODE] ?? DEFAULT_FORMAT;

  // Real past papers for this subject as style references (format only).
  const referencePosts = await prisma.post.findMany({
    where: { courseCode: SUBJECT_CODE, examDate: { not: null } },
    select: { title: true, examDuration: true, quiz: { select: { questions: true } } },
    take: 2,
  });
  const referencePapers = referencePosts.map((p) => ({
    title: p.title ?? '',
    timeLimit: p.examDuration ?? format.timeLimit,
    questions: ((p.quiz?.questions as any[]) ?? []).map((q) => ({ text: q.text, type: q.type, points: q.points })),
  }));

  const subjectLabel = `${subject.nameEn ?? subject.name} (${subject.nameKh}), grade ${subject.grade}${subject.track ? `, ${subject.track} track` : ''}`;
  console.log(`📚 ${subjectLabel} — ${topics.length} units available, target format:`, format);

  const userPrompt = buildUserPrompt(subjectLabel, format, topics.map((t) => t.nameKh ?? t.name), referencePapers);

  // A full paper's worked-solution explanations can be long; the model
  // occasionally truncates mid-string on a first attempt, which breaks
  // JSON.parse with "Unterminated string" — retry once with more headroom
  // before giving up, same one-retry pattern used elsewhere for LLM output
  // issues (e.g. the AI tutor's malformed-Khmer retry).
  let generated: GeneratedQuestion[] | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const maxTokens = attempt === 1 ? 8192 : 16384;
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      lastError = new Error('Claude returned no text content');
      continue;
    }
    if (message.stop_reason === 'max_tokens') {
      console.log(`  ⚠️  attempt ${attempt}: response was truncated (max_tokens=${maxTokens}) — retrying with more headroom.`);
      lastError = new Error('response truncated at max_tokens');
      continue;
    }
    try {
      generated = parseJsonArray(textBlock.text);
      break;
    } catch (err) {
      lastError = err;
      console.log(`  ⚠️  attempt ${attempt}: JSON parse failed (${(err as Error).message}) — retrying.`);
      console.log(`     raw tail: …${textBlock.text.slice(-200)}`);
    }
  }
  if (!generated) throw lastError ?? new Error('Failed to generate a valid exam paper after 2 attempts');

  // Format sanity checks the grader actually depends on (see quizGrading.ts
  // / TakeQuizScreen.tsx) — a wrong correctAnswer FORMAT silently marks a
  // correct student answer as wrong, so these are flagged loudly here rather
  // than only discovered by a student failing a well-answered exam.
  const formatWarning = (q: GeneratedQuestion): string | null => {
    if (q.type === 'TRUE_FALSE' && !['TRUE', 'FALSE'].includes(String(q.correctAnswer).toUpperCase())) {
      return `TRUE_FALSE correctAnswer must be "TRUE"/"FALSE", got ${JSON.stringify(q.correctAnswer)}`;
    }
    if ((q.type === 'SHORT_ANSWER' || q.type === 'FILL_IN_BLANK') && /[$\\]/.test(String(q.correctAnswer))) {
      return `${q.type} correctAnswer must be plain text (no LaTeX), got ${JSON.stringify(q.correctAnswer)}`;
    }
    return null;
  };

  console.log(`\n📝 Generated ${generated.length} questions — full dry-run review:\n`);
  for (const q of generated) {
    const validUnit = topicMap.has(q.unitName);
    console.log(`  ${validUnit ? '✅' : '❌ UNKNOWN UNIT'} [${q.type}, ${q.points}pt, diff ${q.difficulty}] ${q.unitName}`);
    console.log(`     ${q.text}`);
    console.log(`     correctAnswer: ${JSON.stringify(q.correctAnswer)}`);
    const warning = formatWarning(q);
    if (warning) console.log(`     🚨 FORMAT BUG: ${warning}`);
    console.log(`     → ${q.explanation}\n`);
  }
  const totalPoints = generated.reduce((sum, q) => sum + (q.points || 0), 0);
  console.log(`Total points: ${totalPoints} (target: ${format.totalTargetPoints})`);
  const droppedCount = generated.filter((q) => !topicMap.has(q.unitName)).length;
  if (droppedCount > 0) console.log(`⚠️  ${droppedCount} question(s) reference an unrecognized unit and will be DROPPED.`);
  const formatBugCount = generated.filter((q) => formatWarning(q)).length;
  if (formatBugCount > 0) {
    console.log(`\n🚨 ${formatBugCount} question(s) have a correctAnswer FORMAT bug that will break grading — see 🚨 lines above.`);
  }

  if (!APPLY) {
    console.log('\nDry run only — re-run with --apply once this looks right.');
    return;
  }
  if (formatBugCount > 0) {
    throw new Error(`Refusing to --apply: ${formatBugCount} question(s) have a correctAnswer format bug (see above). Re-run the generator.`);
  }

  const validQuestions = generated.filter((q) => topicMap.has(q.unitName));
  const title = `វិញ្ញាសាត្រៀមប្រឡង (AI) ${subject.nameKh} ឆ្នាំ${YEAR}${subject.track ? ` - ${subject.track}` : ''}`;

  const author = AUTHOR_OVERRIDE
    ? await prisma.user.findUnique({ where: { id: AUTHOR_OVERRIDE }, select: { id: true } })
    : await prisma.user.findFirst({ where: { role: { in: ['TEACHER', 'ADMIN', 'SUPER_ADMIN'] }, isActive: true }, select: { id: true } });
  if (!author) throw new Error('No teacher/admin user found to author this exam paper');

  const rawQuestionsWithTopic = validQuestions.map((q, idx) => ({
    ...q,
    id: `ai-exam-${YEAR}-${SUBJECT_CODE}-${idx}`,
    topicId: topicMap.get(q.unitName)!,
  }));
  const prepared = prepareQuizQuestions(rawQuestionsWithTopic, { validTopicIds: new Set(topicMap.values()) });
  const finalTotalPoints = prepared.questionsJson.reduce((sum, q) => sum + q.points, 0);

  const existing = await prisma.post.findFirst({ where: { authorId: author.id, postType: 'QUIZ', title }, select: { id: true } });
  if (existing) {
    console.log(`\n⏭️  A paper titled "${title}" already exists (${existing.id}) — not overwriting. Pick a different --year.`);
    return;
  }

  await prisma.post.create({
    data: {
      authorId: author.id,
      title,
      content: `វិញ្ញាសាត្រៀមប្រឡង AI-generated សម្រាប់ ${subject.nameKh} ឆ្នាំ${YEAR}។ រយៈពេល ៖ ${format.timeLimit} នាទី, ពិន្ទុសរុប ៖ ${finalTotalPoints}។`,
      postType: 'QUIZ',
      visibility: 'PUBLIC',
      courseCode: SUBJECT_CODE,
      examDate: new Date(`${YEAR}-11-01`),
      examDuration: format.timeLimit,
      examTotalPoints: finalTotalPoints,
      examPassingScore: format.passingScore,
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
          difficulty: row.difficulty,
        })),
      },
      quiz: {
        create: {
          questions: prepared.questionsJson as any,
          timeLimit: format.timeLimit,
          passingScore: format.passingScore,
          totalPoints: finalTotalPoints,
        },
      },
    },
  });
  console.log(`\n✅ Created "${title}" — ${prepared.rows.length} row-backed questions, ${finalTotalPoints} total points.`);
}

generate()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
