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
            model: 'gemini-1.5-flash-latest',
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
        const result = await this.model.generateContent(fullPrompt);
        const response = result.response;
        return response.text();
    }

    /**
     * Generate and parse JSON response.
     * Strips markdown code fences if present.
     */
    async generateJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
        const raw = await this.generate(systemPrompt, userPrompt);

        // Strip markdown code fences (```json ... ```)
        const cleaned = raw
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();

        try {
            return JSON.parse(cleaned) as T;
        } catch {
            // Try to extract JSON if surrounded by other text
            const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]) as T;
            }
            throw new Error(`Failed to parse Gemini JSON response: ${cleaned.slice(0, 200)}`);
        }
    }

    isReady(): boolean {
        return this.isInitialized;
    }
}

// Export singleton
export const geminiService = new GeminiService();
