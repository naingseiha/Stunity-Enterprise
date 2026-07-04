import { buildSystemPrompt, AskTutorParams } from './tutor.generator';

const baseParams: AskTutorParams = {
    question: 'How do I solve 2x + 4 = 10?',
    locale: 'en',
    topicName: 'Linear Equations',
};

describe('buildSystemPrompt', () => {
    it('includes the English language instruction for locale=en', () => {
        const prompt = buildSystemPrompt({ ...baseParams, locale: 'en' });
        expect(prompt).toContain('Respond in English');
        expect(prompt).not.toContain('Respond in Khmer');
    });

    it('includes the Khmer language instruction for locale=km', () => {
        const prompt = buildSystemPrompt({ ...baseParams, locale: 'km' });
        expect(prompt).toContain('respond ENTIRELY 100% in natural, fluent Khmer');
        expect(prompt).not.toContain('Respond in English');
    });

    it('detects Khmer script in the question even when locale is not km', () => {
        const prompt = buildSystemPrompt({ ...baseParams, locale: 'en', question: 'តើដោះស្រាយ 2x + 4 = 10 ដោយរបៀបណា?' });
        expect(prompt).toContain('respond ENTIRELY 100% in natural, fluent Khmer');
    });

    it('interpolates miniLesson and formulaSheet when provided', () => {
        const prompt = buildSystemPrompt({
            ...baseParams,
            miniLesson: 'A linear equation has one variable raised to the first power.',
            formulaSheet: [{ expr: 'ax + b = c', noteKh: 'សមីការលីនេអ៊ែរ' }],
        });
        expect(prompt).toContain('A linear equation has one variable');
        expect(prompt).toContain('ax + b = c');
        expect(prompt).toContain('សមីការលីនេអ៊ែរ');
    });

    it('omits lesson/formula labels entirely when not provided', () => {
        const prompt = buildSystemPrompt({ ...baseParams, miniLesson: null, formulaSheet: null });
        expect(prompt).not.toContain('Lesson content the student just studied');
        expect(prompt).not.toContain('Formula sheet for this topic');
    });

    it('always includes the step-by-step / never-bare-answer rule', () => {
        const withContext = buildSystemPrompt({
            ...baseParams,
            miniLesson: 'some lesson',
            formulaSheet: [{ expr: 'x=1' }],
        });
        const withoutContext = buildSystemPrompt(baseParams);
        for (const prompt of [withContext, withoutContext]) {
            expect(prompt).toContain('NEVER give a bare final answer');
            expect(prompt).toContain('step by step');
        }
    });

    it('includes grade and subject in the scope rule when provided', () => {
        const prompt = buildSystemPrompt({ ...baseParams, grade: '9', subjectName: 'Mathematics' });
        expect(prompt).toContain('Mathematics');
        expect(prompt).toContain('grade 9');
    });

    it('instructs LaTeX math notation with $ / $$ delimiters', () => {
        const prompt = buildSystemPrompt(baseParams);
        expect(prompt).toContain('Use LaTeX ONLY for actual mathematical notation');
        expect(prompt).toContain('$...$');
        expect(prompt).toContain('$$...$$');
    });

    it('forbids Khmer/prose text or diagrams inside math delimiters', () => {
        const prompt = buildSystemPrompt(baseParams);
        expect(prompt).toContain('NEVER put Khmer text');
        expect(prompt).toContain('nested bullet list');
    });

    it('instructs sparing use of blockquote for the key takeaway', () => {
        const prompt = buildSystemPrompt(baseParams);
        expect(prompt).toContain('blockquote');
    });
});
