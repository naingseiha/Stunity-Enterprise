/**
 * AI Tutor Generator
 *
 * Answers a student's question grounded in their current Learn-path
 * topic, always step-by-step (never a bare final answer).
 */

import { claudeService } from '../services/claude.service';

export interface AskTutorParams {
    question: string;
    locale: 'km' | 'en';
    grade?: string;
    subjectName?: string;
    topicName: string;
    miniLesson?: string | null;
    formulaSheet?: Array<{ expr: string; noteKh?: string }> | null;
    image?: string | null;
    mimeType?: string | null;
}

export interface TutorAnswer {
    explanation: string;
}

export function buildSystemPrompt(params: AskTutorParams): string {
    const { locale, grade, subjectName, topicName, miniLesson, formulaSheet, image } = params;

    const isKhmerQuery = locale === 'km' || /[\u1780-\u17FF]/.test(params.question);
    const langInstruction = isKhmerQuery
        ? 'CRITICAL LANGUAGE RULE: You MUST respond ENTIRELY 100% in natural, fluent Khmer (ភាសាខ្មែរ). All headings, bullet points, explanations, and instructions must be written in Khmer suitable for a Cambodian school student. Do NOT reply in English, and do NOT write English headings or prose with Khmer translations in parentheses.'
        : 'Respond in English, using clear language suitable for a school student. Note: If the student asks their question in Khmer, respond entirely in Khmer.';

    const contextLines = [
        grade ? `- Grade: ${grade}` : null,
        subjectName ? `- Subject: ${subjectName}` : null,
        `- Current topic: ${topicName}`,
        miniLesson ? `- Lesson content the student just studied:\n${miniLesson}` : null,
        formulaSheet && formulaSheet.length > 0
            ? `- Formula sheet for this topic:\n${formulaSheet
                  .map((f) => `  ${f.expr}${f.noteKh ? ' — ' + f.noteKh : ''}`)
                  .join('\n')}`
            : null,
    ].filter(Boolean);

    return `You are a patient, encouraging AI tutor for Stunity, a school learning platform in Cambodia.

STUDENT CONTEXT:
${contextLines.join('\n')}

RULES (follow strictly):
1. NEVER give a bare final answer. Always walk through the reasoning step by step, the way a teacher would on a whiteboard.
2. Number or clearly separate each step.
3. Ground your explanation in the topic and lesson content above when relevant — reuse the same terms/formulas the student has already seen rather than introducing unfamiliar methods.
4. Stay scoped to "${topicName}"${subjectName ? ` (${subjectName}${grade ? `, grade ${grade}` : ''})` : ''}. If the student's question is wildly unrelated to this topic/subject, gently redirect them back rather than answering fully off-topic.
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
    }`;
}

const DEFAULT_IMAGE_QUESTION: Record<'km' | 'en', string> = {
    km: 'សូមជួយពន្យល់ពីរបៀបដោះស្រាយលំហាត់នៅក្នុងរូបភាពនេះ ជាជំហាន ៗ។',
    en: 'Please help me solve the exercise in this photo, step by step.',
};

export async function askTutor(params: AskTutorParams): Promise<TutorAnswer> {
    // A photo-only message (no typed question) still needs a user-turn prompt
    // for Claude to act on alongside the image content block.
    const userPrompt = params.question.trim() || DEFAULT_IMAGE_QUESTION[params.locale];
    const explanation = await claudeService.generate(
        buildSystemPrompt(params),
        userPrompt,
        params.image,
        params.mimeType
    );
    return { explanation };
}
