/**
 * Gemini AI Service
 * 
 * Singleton wrapper around Google Gemini 1.5 Flash.
 * Handles client initialization, safety settings, and
 * structured JSON output parsing.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';

// ─── Safety Settings ──────────────────────────────────────────────
// Education platform: block medium+ harmful content across all categories
const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ─── Generation Config ────────────────────────────────────────────
const GENERATION_CONFIG = {
    temperature: 0.7,      // Balanced creativity
    topP: 0.85,
    topK: 40,
    maxOutputTokens: 8192,
};

class GeminiService {
    private client: GoogleGenerativeAI;
    private model: GenerativeModel;
    private isInitialized = false;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY is not set. AI features will not work.');
            // Create a dummy client that will fail gracefully
            this.client = new GoogleGenerativeAI('placeholder');
        } else {
            this.client = new GoogleGenerativeAI(apiKey);
            this.isInitialized = true;
            console.log('✅ Gemini AI client initialized');
        }

        this.model = this.client.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: GENERATION_CONFIG,
            safetySettings: SAFETY_SETTINGS,
        });
    }

    /**
     * Generate text with a system prompt and user prompt.
     * Returns raw text response.
     */
    async generate(systemPrompt: string, userPrompt: string): Promise<string> {
        if (!this.isInitialized) {
            throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY.');
        }

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        return this.withRetry(async () => {
            console.log(`🤖 [Gemini] Generating content... (Prompt length: ${fullPrompt.length})`);
            const result = await this.model.generateContent(fullPrompt);
            const response = result.response;
            const text = response.text();
            console.log(`✅ [Gemini] Generation successful (Response length: ${text.length})`);
            return text;
        });
    }

    /**
     * Generate and parse JSON response.
     * Strips markdown code fences if present.
     */
    async generateJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
        if (!this.isInitialized) {
            throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY.');
        }

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        return this.withRetry(async () => {
            console.log(`🤖 [Gemini] Generating JSON for prompt length: ${fullPrompt.length}`);
            const result = await this.model.generateContent(fullPrompt);
            const response = result.response;
            const text = response.text();

            try {
                // Find JSON block if it exists
                const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                    text.match(/{[\s\S]*}/);
                const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
                const cleanedJson = jsonStr.replace(/\\n/g, '').trim();

                const data = JSON.parse(cleanedJson) as T;
                console.log('✅ [Gemini] JSON generated and parsed successfully');
                return data;
            } catch (err) {
                console.error('❌ [Gemini] JSON parse error:', err);
                console.error('Full response text:', text);
                throw new Error('Failed to parse AI response as JSON');
            }
        });
    }

    private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000, startTime?: number): Promise<T> {
        const start = startTime || Date.now();
        const MAX_TOTAL_TIME_MS = 90_000; // 90s total budget to stay within client timeout

        try {
            return await fn();
        } catch (error: any) {
            // Check for 429 (Too Many Requests) or other quota/rate limit errors
            const isQuotaError =
                error?.status === 429 ||
                error?.message?.includes('429') ||
                error?.message?.includes('Quota') ||
                error?.message?.includes('Rate limit');

            const elapsed = Date.now() - start;
            if (isQuotaError && retries > 0 && elapsed < MAX_TOTAL_TIME_MS) {
                let nextDelay = Math.min(delay * 2, 10_000); // Cap delay at 10s

                // Parse retryDelay from error details if available
                try {
                    const details = error?.response?.data?.error?.details || [];
                    const quotaInfo = details.find((d: any) => d.retryDelay);
                    if (quotaInfo?.retryDelay) {
                        const seconds = parseInt(quotaInfo.retryDelay, 10);
                        if (!isNaN(seconds)) {
                            nextDelay = Math.min((seconds + 1) * 1000, 15_000);
                            console.log(`📡 [Gemini] Using suggested retry delay: ${nextDelay}ms`);
                        }
                    }
                } catch (e) {
                    // Fallback to exponential backoff
                }

                // Don't retry if we'd exceed the time budget
                if (elapsed + nextDelay > MAX_TOTAL_TIME_MS) {
                    console.warn(`⚠️ [Gemini] Skipping retry — would exceed 90s time budget (${elapsed}ms elapsed)`);
                    error.status = 429;
                    throw error;
                }

                console.warn(`⚠️ [Gemini] Quota limit reached (429). Retrying in ${nextDelay}ms... (${retries} retries left, ${elapsed}ms elapsed)`);
                await new Promise(resolve => setTimeout(resolve, nextDelay));
                return this.withRetry(fn, retries - 1, nextDelay, start);
            }

            // Attach status and user-friendly message so the route handler returns 429
            if (isQuotaError) {
                const friendlyError = new Error(
                    'AI daily free quota reached. The limit resets every 24 hours — please try again tomorrow.'
                );
                (friendlyError as any).status = 429;
                throw friendlyError;
            }
            throw error;
        }
    }

    isReady(): boolean {
        return this.isInitialized;
    }
}

// Export singleton
export const geminiService = new GeminiService();
