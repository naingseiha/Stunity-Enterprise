/**
 * Course Outline Generator
 * 
 * Generates a full course syllabus structure for CourseForm.tsx.
 */

import { geminiService } from '../services/gemini.service';

export interface GenerateCourseParams {
    topic: string;
    gradeLevel?: string;
    weekCount?: number;
    subject?: string;
}

export interface CourseLesson {
    title: string;
    description: string;
    duration: string; // e.g. "45 minutes"
}

export interface CourseSyllabusSection {
    title: string;
    description: string;
    lessons: CourseLesson[];
}

export interface GeneratedCourse {
    title: string;
    description: string;
    objectives: string[];
    syllabusSections: CourseSyllabusSection[];
    suggestedTags: string[];
}

const SYSTEM_PROMPT = `You are an expert curriculum designer for Stunity, a school learning platform.
Your task is to create a structured course outline.

RULES:
- Output ONLY valid JSON — no extra text or markdown fences
- Each section should be a logical unit of learning (like a chapter)
- Lessons within a section should be sequential and build on each other
- Keep lesson descriptions concise (1 sentence)
- Learning objectives should be measurable (start with action verbs: explain, calculate, identify, etc.)

JSON FORMAT:
{
  "title": "<course title>",
  "description": "<2-3 sentence course overview>",
  "objectives": ["<learning objective 1>", "<learning objective 2>", "<learning objective 3>"],
  "syllabusSections": [
    {
      "title": "<section title>",
      "description": "<section overview>",
      "lessons": [
        { "title": "<lesson title>", "description": "<what students will learn>", "duration": "45 minutes" }
      ]
    }
  ],
  "suggestedTags": ["<tag1>", "<tag2>"]
}`;

export async function generateCourseOutline(params: GenerateCourseParams): Promise<GeneratedCourse> {
    const {
        topic,
        gradeLevel = 'Grade 8',
        weekCount = 4,
        subject,
    } = params;

    const userPrompt = `Create a ${weekCount}-week course outline about "${topic}" for ${gradeLevel} students.
${subject ? `Subject area: ${subject}` : ''}
Include ${weekCount} sections (one per week), each with 3-4 lessons.
Return ONLY the JSON object.`;

    return geminiService.generateJSON<GeneratedCourse>(SYSTEM_PROMPT, userPrompt);
}
