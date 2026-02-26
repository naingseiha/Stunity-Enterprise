/**
 * Poll Options Generator
 * 
 * Generates engaging poll options for a given topic.
 */

import { geminiService } from '../services/gemini.service';

export interface GeneratePollParams {
    topic: string;
    optionCount?: number;
    context?: string; // e.g., "school-related", "academic preference"
}

export interface GeneratedPoll {
    question: string;  // Suggested poll question
    options: string[]; // Poll options (4-6 items)
}

const SYSTEM_PROMPT = `You are a creative content helper for Stunity, a school learning platform.
Your task is to generate engaging poll options for the school community.

RULES:
- Output ONLY valid JSON matching the specified format — no extra text
- Options should be balanced (no clearly "right" answer unless it's a knowledge poll)
- Keep options concise (5-10 words each)
- Options must be school-appropriate and inclusive
- Make it fun and engaging for students/teachers

JSON FORMAT:
{
  "question": "<refined or suggested poll question>",
  "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"]
}`;

export async function generatePollOptions(params: GeneratePollParams): Promise<GeneratedPoll> {
    const { topic, optionCount = 4, context } = params;

    const userPrompt = `Generate exactly ${optionCount} poll options about: "${topic}"
${context ? `Context: ${context}` : ''}
Return ONLY the JSON object.`;

    const result = await geminiService.generateJSON<GeneratedPoll>(SYSTEM_PROMPT, userPrompt);

    return {
        question: result.question || topic,
        options: (result.options || []).slice(0, optionCount),
    };
}
