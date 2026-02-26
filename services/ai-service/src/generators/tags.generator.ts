/**
 * Smart Tag Suggestions Generator
 * 
 * Analyzes post content and suggests relevant topic tags.
 */

import { geminiService } from '../services/gemini.service';

export interface SuggestTagsParams {
    content: string;
    existingTags?: string[];
    maxTags?: number;
}

export interface SuggestedTags {
    tags: string[]; // lowercase, no # prefix
}

const SYSTEM_PROMPT = `You are a taxonomy and categorization expert for Stunity, an educational platform.
Your task is to analyze user content and suggest relevant topic tags.

RULES:
- Output ONLY valid JSON — no extra text
- Tags should be single words or short phrases (max 2-3 words)
- Tags must be strictly lowercase
- Do not include the '#' symbol prefix
- Tags should represent the core educational concepts, subject matter, or context
- Ensure tags are school/education appropriate

JSON FORMAT:
{
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}`;

export async function suggestTags(params: SuggestTagsParams): Promise<SuggestedTags> {
    const { content, existingTags = [], maxTags = 5 } = params;

    const userPrompt = `Suggest up to ${maxTags} tags for the following content:

"${content}"
${existingTags.length > 0 ? `\nExclude these existing tags: ${existingTags.join(', ')}` : ''}

Return ONLY the JSON object.`;

    const result = await geminiService.generateJSON<SuggestedTags>(SYSTEM_PROMPT, userPrompt);

    return {
        tags: (result.tags || []).slice(0, maxTags).map(t => t.toLowerCase().replace(/^#/, '').trim())
    };
}
