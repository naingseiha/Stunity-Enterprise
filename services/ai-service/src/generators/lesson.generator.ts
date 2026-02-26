/**
 * Lesson / Article Generator
 * 
 * Generates structured educational lesson content in Markdown.
 */

import { geminiService } from '../services/gemini.service';

export interface GenerateLessonParams {
    topic: string;
    gradeLevel?: string;
    length?: 'SHORT' | 'MEDIUM' | 'LONG';
    subject?: string;
    tone?: 'academic' | 'conversational' | 'engaging';
}

export interface GeneratedLesson {
    title: string;
    content: string; // markdown body
    summary: string; // 1-2 sentence summary
    suggestedTags: string[];
}

const SYSTEM_PROMPT = `You are an expert educational content writer for Stunity, a school social learning platform.
Your task is to write clear, engaging, and age-appropriate educational lessons.

RULES:
- Output ONLY valid JSON matching the specified format — no extra text
- Use simple Markdown formatting for the content field (## headings, **bold**, bullet lists)
- Write for the specified grade level — adjust vocabulary and complexity accordingly
- Structure: Introduction → Core Concepts → Examples/Application → Key Takeaways
- Ensure content is 100% factually accurate and appropriate for school students
- Do NOT include any inappropriate content

JSON FORMAT:
{
  "title": "<lesson title>",
  "content": "<full markdown lesson body>",
  "summary": "<1-2 sentence summary for preview>",
  "suggestedTags": ["<tag1>", "<tag2>", "<tag3>"]
}`;

const LENGTH_GUIDES = {
    SHORT: '300-400 words',
    MEDIUM: '500-700 words',
    LONG: '800-1000 words',
};

export async function generateLesson(params: GenerateLessonParams): Promise<GeneratedLesson> {
    const {
        topic,
        gradeLevel = 'Grade 8',
        length = 'MEDIUM',
        subject,
        tone = 'engaging',
    } = params;

    const userPrompt = `Write a ${tone} educational lesson about "${topic}" for ${gradeLevel} students.
${subject ? `Subject: ${subject}` : ''}
Target length: ${LENGTH_GUIDES[length]}
Return ONLY the JSON object.`;

    return geminiService.generateJSON<GeneratedLesson>(SYSTEM_PROMPT, userPrompt);
}
