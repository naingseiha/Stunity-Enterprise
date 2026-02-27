# 🤖 AI Integration — Create Post

**Version:** 1.1 | **Updated:** February 27, 2026 (Fixes for 404 & Android Crash)

> AI-assisted content generation for all Stunity post types, powered by Google Gemini 1.5 Flash (free tier).

---

## Overview

Stunity integrates Google Gemini AI into the **Create Post** flow, giving teachers and students one-tap generation of quizzes, lessons, announcements, poll options, course outlines, project milestones, and question tags.

---

## Architecture

```
Mobile App (React Native)
  │
  │  POST /ai/generate/quiz  (etc.)
  ▼
AI Service  :3020  (services/ai-service/)
  │
  │  @google/generative-ai SDK
  ▼
Google Gemini 1.5 Flash API
```

### Key Files

| Layer | File | Purpose |
|-------|------|---------|
| **Backend** | `services/ai-service/src/services/gemini.service.ts` | Singleton Gemini client, JSON generation |
| **Backend** | `services/ai-service/src/routes/*.ts` | Express route handlers per feature |
| **API Client** | `apps/mobile/src/api/ai.ts` | Axios client for AI service (`Config.aiUrl`) |
| **Service Wrapper** | `apps/mobile/src/services/ai.service.ts` | Clean async interface for UI components |
| **UI Components** | `apps/mobile/src/components/ai/` | Reusable AI UI primitives |
| **Forms** | `apps/mobile/src/screens/feed/create-post/forms/` | Per-post-type forms with AI buttons |

---

## Backend — AI Service (`:3020`)

### Gemini Client (`gemini.service.ts`)

```typescript
// Model: gemini-flash-latest (active free tier)
// Note: gemini-1.5-flash-latest may return 404 in some regions.
this.model = this.client.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
    safetySettings: [ /* BLOCK_MEDIUM_AND_ABOVE for all harm categories */ ],
});
```

All AI calls go through `geminiService.generateJSON<T>(systemPrompt, userPrompt)` which:
1. Sends a combined prompt to Gemini
2. Strips markdown code-fences from the response
3. Parses and returns structured JSON

### API Endpoints

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| `POST` | `/ai/generate/quiz` | `{ topic, gradeLevel?, questionCount?, difficulty? }` | `{ questions: QuizQuestion[] }` |
| `POST` | `/ai/generate/lesson` | `{ topic, gradeLevel?, length?, tone? }` | `{ title, objectives, content, activities, assessment }` |
| `POST` | `/ai/generate/poll-options` | `{ topic, optionCount? }` | `{ question, options: string[] }` |
| `POST` | `/ai/generate/course` | `{ topic, gradeLevel?, weekCount? }` | `{ title, description, weeks: Week[] }` |
| `POST` | `/ai/enhance/content` | `{ content, tone?, type? }` | `{ enhanced, changes }` |
| `POST` | `/ai/generate/announcement` | `{ notes, schoolName?, urgency? }` | `{ subject, body }` |
| `POST` | `/ai/generate/milestones` | `{ projectTitle, description, durationWeeks? }` | `{ milestones: Milestone[] }` |
| `POST` | `/ai/suggest/tags` | `{ content, existingTags?, maxTags? }` | `{ tags: string[] }` |

All endpoints require a valid `Bearer` token (same JWT as other services).

---

## Mobile — AI Components (`src/components/ai/`)

Four reusable primitives handle the full AI UX loop:

| Component | Description |
|-----------|-------------|
| `AIGenerateButton` | Sparkle ✨ button that triggers the prompt modal. Sizes: `small`, `medium`. Types: `filled`, `ghost`. |
| `AIPromptModal` | Bottom sheet where the user configures the generation (topic, grade level, count). Types: `quiz`, `lesson`, `poll`, `course`, `announcement`, `milestone`. |
| `AILoadingOverlay` | Full-screen animated overlay shown during generation. |
| `AIResultPreview` | Modal showing the generated result with **Accept / Regenerate / Discard** actions. |

### Usage Pattern (every form follows this)

```typescript
// 1. State
const [isAiModalVisible, setIsAiModalVisible] = useState(false);
const [isAiLoading, setIsAiLoading]           = useState(false);
const [aiPreviewData, setAiPreviewData]        = useState<any>(null);

// 2. Generate
const handleGenerateAI = async (data: AIPromptData) => {
    setIsAiLoading(true);
    try {
        const result = await aiService.generateQuiz(data.topic, data.gradeLevel, data.count);
        setAiPreviewData(result);
    } finally {
        setIsAiLoading(false);
    }
};

// 3. Render
<AIGenerateButton onPress={() => setIsAiModalVisible(true)} />
<AIPromptModal visible={isAiModalVisible} type="quiz" onGenerate={handleGenerateAI} />
<AILoadingOverlay isVisible={isAiLoading && !aiPreviewData} />
<AIResultPreview
    visible={!!aiPreviewData}
    onAccept={handleAcceptAI}
    onRegenerate={() => handleGenerateAI(lastPrompt!)}
    onDiscard={() => setAiPreviewData(null)}
/>
```

---

## AI Features by Post Type

### Quiz (`QuizForm.tsx`)
- **Generate Quiz** button above the question list
- Generates N questions with options, correct answer, and explanation
- Accepted questions are appended to the existing list

### Lesson (`AnnouncementForm.tsx` + Lesson)
- **Draft Lesson** button inside the content card
- Generates objectives, body content, activities, and an assessment section
- Accepted content fills the editor directly

### Announcement (`AnnouncementForm.tsx`)
- **Draft Announcement** button next to the title field
- Input: rough notes + urgency level
- Generates a professional subject line + formatted body

### Poll (`PollForm.tsx`)
- **Generate Options** button in the options card
- Generates a question and up to 6 answer choices from a topic
- Accepted options replace the current option list

### Course (`CourseForm.tsx`)
- **Generate Outline** button in the course structure card
- Generates a week-by-week syllabus
- Accepted outline populates the weeks list

### Project (`ProjectForm.tsx`)
- **Suggest Milestones** button in the milestones card
- Generates milestone titles with suggested durations
- Accepted milestones replace the current milestone list; total duration auto-calculated

### Question (`QuestionForm.tsx`)
- **Improve Question** — enhances the user's topic with AI
- **Suggest Tags** — auto-generates 5 relevant topic tags inline (no modal needed)

---

## Setup & Configuration

### 1. Get a Free Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Copy the key

### 2. Set the Environment Variable

Add to `services/ai-service/.env`:

```bash
GEMINI_API_KEY=your_key_here
```

### 3. Add AI Service URL to Mobile Config

In `apps/mobile/src/config/env.ts`, ensure `aiUrl` is set:

```typescript
aiUrl: process.env.AI_URL || `http://${apiHost}:3020`,
```

In `apps/mobile/.env`:
```bash
AI_URL=http://10.x.x.x:3020   # your machine's LAN IP
```

### 4. Start Services

```bash
./quick-start.sh   # starts all services including AI at :3020
```

---

## Free Tier Limits (gemini-1.5-flash-latest)

| Metric | Limit |
|--------|-------|
| Requests per minute | 15 |
| Requests per day | 1,500 |
| Input tokens per minute | 1,000,000 |
| Output tokens per minute | 32,000 |

For a school with ~100 teachers generating a few posts per day, the free tier is more than sufficient.

> **If you hit a 429 error:** Wait ~1 minute (RPM reset) or switch to `gemini-1.5-flash-8b` which has higher free-tier limits.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `429 Too Many Requests` | Rate limit exceeded | Wait 60s or switch to `gemini-1.5-flash-8b` |
| `404 Not Found` (model) | Wrong model name or old SDK | Ensure model is `gemini-1.5-flash-latest` and SDK is latest |
| `quota exceeded, limit: 0` | Using `gemini-2.0-flash` (no free tier) | Change model to `gemini-1.5-flash-latest` in `gemini.service.ts` |
| `500` from AI service | `GEMINI_API_KEY` not set | Add key to `services/ai-service/.env` and restart |
| `AxiosError: Network Error` | AI service not running | Run `./quick-start.sh` or check port 3020 |

---

## Changing the AI Model

Edit `services/ai-service/src/services/gemini.service.ts` line 46:

```typescript
model: 'gemini-flash-latest',   // ← change this
```

| Model | Free? | Speed | Quality |
|-------|-------|-------|---------|
| `gemini-1.5-flash-8b` | ✅ Higher limits | ⚡ Fastest | Good |
| `gemini-1.5-flash-latest` | ✅ Standard free | ⚡ Fast | Better |
| `gemini-1.5-pro-latest` | ✅ 50 req/day | 🐢 Slower | Best |
| `gemini-2.0-flash` | ❌ No free tier | ⚡ Fast | Better |

After changing the model, restart the AI service:
```bash
./quick-start.sh
```
