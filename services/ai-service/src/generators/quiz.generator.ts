/**
 * Quiz Generator
 * 
 * Generates quiz questions using Gemini.
 * Output format matches QuizQuestion[] used in QuizForm.tsx.
 */

import { geminiService } from '../services/gemini.service';

export interface GeneratedQuizQuestion {
    id: string;
    text: string;
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE';
    options: string[];
    correctAnswer: string; // index as string e.g. "0", "1", "2"
    explanation: string;
    points: number;
}

export interface GenerateQuizParams {
    topic: string;
    gradeLevel?: string;
    questionCount?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    subject?: string;
}

const SYSTEM_PROMPT = `You are an expert educational content creator for a school platform called Stunity.
Your task is to generate high-quality quiz questions for students.

RULES:
- Output ONLY valid JSON — a JSON array of question objects, no extra text or markdown
- Each question must be clear, unambiguous, and pedagogically sound
- Options must be plausible but only one is correct
- Explanations should be concise (1-2 sentences) and educational
- Difficulty levels: EASY (recall/recognition), MEDIUM (understanding/application), HARD (analysis/synthesis)
- DO NOT include any inappropriate content — this is for school-age students

JSON FORMAT for each question:
{
  "id": "<unique string>",
  "text": "<the question text>",
  "type": "MULTIPLE_CHOICE",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correctAnswer": "<index of correct option as string, e.g. '0' for option A>",
  "explanation": "<why this is the correct answer>",
  "points": <1 for EASY, 2 for MEDIUM, 3 for HARD>
}`;

export async function generateQuiz(params: GenerateQuizParams): Promise<GeneratedQuizQuestion[]> {
    const {
        topic,
        gradeLevel = 'Grade 8',
        questionCount = 5,
        difficulty = 'MEDIUM',
        subject,
    } = params;

    const userPrompt = `Generate exactly ${questionCount} ${difficulty} difficulty quiz questions about "${topic}"
for ${gradeLevel} students${subject ? ` in the subject "${subject}"` : ''}.
Return ONLY a JSON array of ${questionCount} question objects.`;

    const questions = await geminiService.generateJSON<GeneratedQuizQuestion[]>(SYSTEM_PROMPT, userPrompt);

    // Validate and normalize the response
    if (!Array.isArray(questions)) {
        throw new Error('Gemini returned non-array quiz response');
    }

    return questions.slice(0, questionCount).map((q, index) => ({
        id: q.id || `ai-q-${Date.now()}-${index}`,
        text: q.text || '',
        type: (q.type as 'MULTIPLE_CHOICE' | 'TRUE_FALSE') || 'MULTIPLE_CHOICE',
        options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
        correctAnswer: q.correctAnswer?.toString() || '0',
        explanation: q.explanation || '',
        points: typeof q.points === 'number' ? q.points : 1,
    }));
}
