/**
 * Content Enhancer Generator
 * 
 * Improves grammar, clarity, and tone of existing post content.
 * Also handles: generate announcement from rough notes,
 * improve a question post, expand article intro, etc.
 */

import { geminiService } from '../services/gemini.service';

export interface EnhanceContentParams {
    content: string;
    tone?: 'educational' | 'formal' | 'engaging' | 'concise';
    type?: 'article' | 'announcement' | 'question' | 'general';
}

export interface EnhancedContent {
    enhanced: string;
    changes: string; // brief description of what was improved
}

export interface GenerateAnnouncementParams {
    notes: string;       // rough bullet points or short note from teacher
    schoolName?: string;
    urgency?: 'info' | 'important' | 'urgent';
}

export interface GeneratedAnnouncement {
    subject: string;
    body: string;
}

// ─── Content Enhancer ─────────────────────────────────────────────
const ENHANCE_SYSTEM_PROMPT = `You are a writing assistant for Stunity, a school learning platform.
Improve the provided text for clarity, grammar, and tone while preserving the original meaning.

RULES:
- Output ONLY valid JSON — no extra text
- Keep the improved text in the same language as the input
- Do not add new information not present in the original
- Make it professional and appropriate for an educational platform

JSON FORMAT:
{
  "enhanced": "<the improved text>",
  "changes": "<brief description of what was improved, e.g. 'Fixed grammar, improved clarity and structure'>"
}`;

export async function enhanceContent(params: EnhanceContentParams): Promise<EnhancedContent> {
    const { content, tone = 'educational', type = 'general' } = params;

    const userPrompt = `Improve this ${type} text to have a ${tone} tone:

"${content}"

Return ONLY the JSON object.`;

    return geminiService.generateJSON<EnhancedContent>(ENHANCE_SYSTEM_PROMPT, userPrompt);
}

// ─── Announcement Generator ───────────────────────────────────────
const ANNOUNCEMENT_SYSTEM_PROMPT = `You are an administrative writing assistant for Stunity schools.
Transform rough teacher notes into a formal school announcement.

RULES:
- Output ONLY valid JSON — no extra text
- Use professional but accessible language
- Be clear and direct about what action (if any) is required
- Appropriate for parents, students, and staff

JSON FORMAT:
{
  "subject": "<announcement subject/title>",
  "body": "<full announcement body text>"
}`;

export async function generateAnnouncement(params: GenerateAnnouncementParams): Promise<GeneratedAnnouncement> {
    const { notes, schoolName, urgency = 'info' } = params;

    const urgencyGuide = {
        info: 'informational, no immediate action required',
        important: 'important, please read carefully',
        urgent: 'urgent, requires immediate attention',
    };

    const userPrompt = `Create a ${urgencyGuide[urgency]} school announcement${schoolName ? ` from ${schoolName}` : ''} based on these notes:

"${notes}"

Return ONLY the JSON object.`;

    return geminiService.generateJSON<GeneratedAnnouncement>(ANNOUNCEMENT_SYSTEM_PROMPT, userPrompt);
}

// ─── Milestone Generator ──────────────────────────────────────────
export interface GenerateMilestonesParams {
    projectTitle: string;
    description: string;
    durationWeeks?: number;
}

export interface ProjectMilestone {
    title: string;
    description: string;
    dueWeek: number;
    deliverable: string;
}

export interface GeneratedMilestones {
    milestones: ProjectMilestone[];
}

const MILESTONES_SYSTEM_PROMPT = `You are a project management assistant for Stunity school projects.
Create realistic project milestones for student projects.

RULES:
- Output ONLY valid JSON — no extra text
- Milestones should build progressively toward the final deliverable
- Each milestone must have a concrete, verifiable deliverable
- Due weeks should be evenly distributed across the project duration

JSON FORMAT:
{
  "milestones": [
    {
      "title": "<milestone name>",
      "description": "<what needs to be done>",
      "dueWeek": <week number>,
      "deliverable": "<what to submit>"
    }
  ]
}`;

export async function generateMilestones(params: GenerateMilestonesParams): Promise<GeneratedMilestones> {
    const { projectTitle, description, durationWeeks = 4 } = params;

    const userPrompt = `Create ${durationWeeks} milestones for a student project:
Title: "${projectTitle}"
Description: "${description}"
Total duration: ${durationWeeks} weeks

Return ONLY the JSON object.`;

    return geminiService.generateJSON<GeneratedMilestones>(MILESTONES_SYSTEM_PROMPT, userPrompt);
}
