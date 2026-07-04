/**
 * AI Tutor Generator
 *
 * Answers a student's question grounded in their current Learn-path
 * topic, always step-by-step (never a bare final answer). When no
 * topic is bound (the general-purpose Learn-home entry point), falls
 * back to an unscoped "any subject" mode instead.
 */

import { claudeService } from '../services/claude.service';
import { hasMalformedKhmerText } from '../utils/khmerText';

export interface AskTutorParams {
    question: string;
    locale: 'km' | 'en';
    grade?: string;
    subjectName?: string;
    topicName?: string;
    miniLesson?: string | null;
    formulaSheet?: Array<{ expr: string; noteKh?: string }> | null;
    image?: string | null;
    mimeType?: string | null;
}

export interface TutorAnswer {
    explanation: string;
}

// Correct Khmer terminology for common math/science concepts, added to the
// system prompt for Khmer replies only. Left to its own translation, the
// model drifts toward literal/incorrect calques — e.g. Claude Haiku produced
// "ចំនួនឯកតា" for "irrational number" instead of the real term below.
const KHMER_GLOSSARY: Array<[string, string]> = [
    ['irrational number', 'ចំនួនអសនិទាន'],
    ['rational number', 'ចំនួនសនិទាន'],
    ['real number', 'ចំនួនពិត'],
    ['integer', 'ចំនួនគត់'],
    ['natural number', 'ចំនួនធម្មជាតិ'],
    ['prime number', 'ចំនួនសំខាន់'],
    ['equation', 'សមីការ'],
    ['inequality', 'វិសមភាព'],
    ['function', 'អនុគមន៍'],
    ['variable', 'អថេរ'],
    ['coefficient', 'មេគុណ'],
    ['exponent / power', 'និទស្សន្ត'],
    ['square root', 'ឫសការេ'],
    ['fraction', 'ប្រភាគ'],
    ['numerator', 'សម្គាល់ភាគយក'],
    ['denominator', 'ភាគបែង'],
    ['triangle', 'ត្រីកោណ'],
    ['angle', 'មុំ'],
    ['perimeter', 'បរិមាត្រ'],
    ['area', 'ក្រឡាផ្ទៃ'],
    ['volume', 'មាឌ'],
    ['probability', 'ប្រូបាប៊ីលីតេ'],
    ['derivative', 'ածេលបន្ត'],
    ['atom', 'អាតូម'],
    ['molecule', 'ម៉ូលេគុល'],
    ['cell (biology)', 'កោសិកា'],
    ['force', 'កម្លាំង'],
    ['velocity', 'ល្បឿន'],
    ['energy', 'ថាមពល'],
];

const KHMER_FEW_SHOT_EXAMPLE = `EXAMPLE OF CORRECT KHMER TUTORING STYLE (mirror this tone, structure, and terminology exactly — do not copy the numbers):

Student question: តើដោះស្រាយសមីការ $2x + 4 = 10$ ដោយរបៀបណា?

Correct answer:
## ជំហានទី ១៖ ដកលេខថេរចេញ
ដើម្បីដោះស្រាយ **សមីការ** នេះ ត្រូវដកលេខ 4 ចេញពីសមាជិកទាំងពីរជាមុនសិន៖
$$2x + 4 - 4 = 10 - 4$$
$$2x = 6$$

## ជំហានទី ២៖ ចែកនឹងមេគុណរបស់ $x$
**មេគុណ** នៃ $x$ គឺ 2 ដូច្នេះត្រូវចែកសមាជិកទាំងពីរនឹង 2៖
$$x = \\frac{6}{2} = 3$$

> ចម្លើយ៖ $x = 3$

តើអ្នកចង់ព្យាយាមដោះស្រាយសមីការស្រដៀងគ្នាមួយទៀតដែរឬទេ?`;

export function buildSystemPrompt(params: AskTutorParams): string {
    const { locale, grade, subjectName, topicName, miniLesson, formulaSheet, image } = params;

    const isKhmerQuery = locale === 'km' || /[ក-៿]/.test(params.question);
    const langInstruction = isKhmerQuery
        ? 'CRITICAL LANGUAGE RULE: You MUST respond ENTIRELY 100% in natural, fluent Khmer (ភាសាខ្មែរ). All headings, bullet points, explanations, and instructions must be written in Khmer suitable for a Cambodian school student. Do NOT reply in English, and do NOT write English headings or prose with Khmer translations in parentheses.'
        : 'Respond in English, using clear language suitable for a school student. Note: If the student asks their question in Khmer, respond entirely in Khmer.';

    const contextLines = [
        grade ? `- Grade: ${grade}` : null,
        subjectName ? `- Subject: ${subjectName}` : null,
        topicName ? `- Current topic: ${topicName}` : null,
        miniLesson ? `- Lesson content the student just studied:\n${miniLesson}` : null,
        formulaSheet && formulaSheet.length > 0
            ? `- Formula sheet for this topic:\n${formulaSheet
                  .map((f) => `  ${f.expr}${f.noteKh ? ' — ' + f.noteKh : ''}`)
                  .join('\n')}`
            : null,
    ].filter(Boolean);

    const scopeRule = topicName
        ? `Stay scoped to "${topicName}"${subjectName ? ` (${subjectName}${grade ? `, grade ${grade}` : ''})` : ''}. If the student's question is wildly unrelated to this topic/subject, gently redirect them back rather than answering fully off-topic.`
        : `You are not tied to a single unit or subject — the student may ask about any school subject (math, physics, chemistry, biology, or other coursework) or attach a photo of any exercise/exam paper. Work out the subject and topic yourself from the question or image and answer it directly. Only gently redirect if the request has nothing to do with school subjects at all.`;

    const glossarySection = isKhmerQuery
        ? `\n\nKHMER TERMINOLOGY GLOSSARY (use these exact standard terms — never invent or literally calque a translation):\n${KHMER_GLOSSARY.map(
              ([en, km]) => `- ${en} → ${km}`
          ).join('\n')}\n\n${KHMER_FEW_SHOT_EXAMPLE}`
        : '';

    return `You are a patient, encouraging AI tutor for Stunity, a school learning platform in Cambodia.

STUDENT CONTEXT:
${contextLines.join('\n')}

RULES (follow strictly):
1. NEVER give a bare final answer. Always walk through the reasoning step by step, the way a teacher would on a whiteboard.
2. Number or clearly separate each step.
3. Ground your explanation in the topic and lesson content above when relevant — reuse the same terms/formulas the student has already seen rather than introducing unfamiliar methods.
4. ${scopeRule}
5. ${langInstruction}
6. Keep the tone warm and encouraging — this is a student who may be struggling.
7. End with a short check-in question or a hint of what to try next, not just the answer.
8. Do not mention that you are an AI model, Claude, or Anthropic.
9. Use markdown for structure: ## headings for sections, **bold** for key terms, numbered/bulleted lists for steps.
10. CRITICAL LATEX DELIMITER RULE: You MUST ALWAYS wrap every mathematical expression, number with roots/fractions/exponents, or LaTeX command (like \\sqrt{...}, \\frac{...}, \\times, \\approx, \\in, \\subset, \\cup, \\cap) in valid LaTeX delimiters ($...$ for inline math, $$...$$ for standalone formulas). NEVER write raw LaTeX code like \\sqrt{9} in plain text without wrapping it in $ or $$ delimiters! Conversely, NEVER wrap Khmer words inside $ or $$ delimiters.
11. NEVER put Khmer text, English prose, word labels, or diagrams inside $...$ or $$...$$ — the math renderer's font has no Khmer glyphs and words rendered as "math" will show as broken boxes. Words and labels always stay as plain text outside the $ delimiters, even right next to a formula (e.g. "ចម្លើយគឺ $x = 3$" is correct; "$ចម្លើយ$" is wrong).
12. For classifications, hierarchies, or category breakdowns (e.g. types of numbers, branches of a tree), use a plain markdown nested bullet list — never LaTeX, ASCII art, or box-drawing characters for this.
13. Use a markdown blockquote (> ) to highlight the single most important formula, definition, or final result so the student can spot it at a glance — use this sparingly, for one key takeaway per answer, not every line.
14. FORMAL TEXTBOOK TONE & SYMBOLS: Keep formatting clean and professional like a Cambodian school textbook. Do NOT put emojis, icons, or decorative symbols in section headings (e.g. write "## និយមន័យ", never "## និយមន័យ 📚") or at the very end of sentences/questions. Never use ASCII art, box-drawing characters, dingbats, or obscure Unicode symbols.${
        image
            ? '\n15. The student has attached a photo of a handwritten or textbook exercise. Read the problem directly from the image (do not ask them to retype it) and solve it step by step following all the rules above.'
            : ''
    }${glossarySection}`;
}

// Appended to the system prompt on a retry, after the first Khmer response
// came back with detectable script corruption (isolated diacritics with no
// base consonant, or foreign letters fused into a Khmer word).
const KHMER_RETRY_INSTRUCTION =
    '\n\nCRITICAL RETRY NOTICE: Your previous attempt at this answer contained corrupted Khmer script (broken diacritics or foreign letters mixed into Khmer words). Re-write the full answer from scratch, spelling each Khmer word carefully and completely using only real, correctly-spelled Khmer script — no partial words, no non-Khmer letters inside Khmer words.';

const DEFAULT_IMAGE_QUESTION: Record<'km' | 'en', string> = {
    km: 'សូមជួយពន្យល់ពីរបៀបដោះស្រាយលំហាត់នៅក្នុងរូបភាពនេះ ជាជំហាន ៗ។',
    en: 'Please help me solve the exercise in this photo, step by step.',
};

export async function askTutor(params: AskTutorParams): Promise<TutorAnswer> {
    // A photo-only message (no typed question) still needs a user-turn prompt
    // for Claude to act on alongside the image content block.
    const userPrompt = params.question.trim() || DEFAULT_IMAGE_QUESTION[params.locale];
    const isKhmerQuery = params.locale === 'km' || /[ក-៿]/.test(params.question);

    const systemPrompt = buildSystemPrompt(params);
    let explanation = await claudeService.generate(systemPrompt, userPrompt, params.image, params.mimeType);

    if (isKhmerQuery && hasMalformedKhmerText(explanation)) {
        console.warn('⚠️ [Tutor] Detected malformed Khmer script in response — retrying once');
        explanation = await claudeService.generate(
            systemPrompt + KHMER_RETRY_INSTRUCTION,
            userPrompt,
            params.image,
            params.mimeType
        );
    }

    return { explanation };
}
