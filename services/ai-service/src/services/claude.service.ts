/**
 * Claude AI Service
 *
 * Singleton wrapper around the Anthropic Claude API.
 * Used by the AI Tutor feature — kept independent from Gemini so the
 * tutor isn't blocked by Gemini-specific billing/quota issues.
 */

import Anthropic from '@anthropic-ai/sdk';

// Sonnet, not Haiku: re-tested Haiku after fixing the WebView Khmer-font
// bug (2026-07-04) with matched prompts — Haiku still produced Cyrillic
// script mixed into Khmer words, broke its own "no Khmer inside $ math
// delimiters" rule (reintroducing the tofu-box risk), and used incorrect
// Khmer math terminology, none of which were present in equivalent Sonnet
// responses. Costs ~3-6x more per token than Haiku, but Khmer generation
// reliability is worth it for an education product.
const TUTOR_MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 4096;

class ClaudeService {
    private client: Anthropic;
    private isInitialized = false;

    constructor() {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error('❌ ANTHROPIC_API_KEY is not set. AI Tutor will not work.');
            this.client = new Anthropic({ apiKey: 'placeholder' });
        } else {
            this.client = new Anthropic({ apiKey });
            this.isInitialized = true;
            console.log('✅ Anthropic Claude client initialized');
        }
    }

    /**
     * Generate text with a system prompt and user prompt.
     * Returns raw text response (non-streaming — tutor answers are short).
     */
    async generate(
        systemPrompt: string, 
        userPrompt: string, 
        image?: string | null, 
        mimeType?: string | null
    ): Promise<string> {
        if (!this.isInitialized) {
            throw new Error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY.');
        }

        return this.withRetry(async () => {
            console.log(`🤖 [Claude] Generating content... (Prompt length: ${userPrompt.length}, hasImage: ${!!image})`);
            
            const content: any[] = [{ type: 'text', text: userPrompt }];
            if (image && mimeType) {
                content.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mimeType as any,
                        data: image,
                    },
                });
            }

            const message = await this.client.messages.create({
                model: TUTOR_MODEL,
                max_tokens: MAX_TOKENS,
                system: systemPrompt,
                messages: [{ role: 'user', content }],
            });

            const textBlock = message.content.find((block) => block.type === 'text');
            if (!textBlock || textBlock.type !== 'text') {
                throw new Error('Claude returned no text content');
            }
            if (message.stop_reason === 'refusal') {
                throw new Error('Claude declined to answer this question');
            }
            if (message.stop_reason === 'max_tokens') {
                console.warn('⚠️ [Claude] Output was truncated due to reaching max_tokens limit!');
            }

            console.log(`✅ [Claude] Generation successful (Response length: ${textBlock.text.length})`);
            return textBlock.text;
        });
    }

    private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000, startTime?: number): Promise<T> {
        const start = startTime || Date.now();
        const MAX_TOTAL_TIME_MS = 90_000; // 90s total budget to stay within client timeout

        try {
            return await fn();
        } catch (error: any) {
            const isRateLimitError = error instanceof Anthropic.RateLimitError || error?.status === 429;

            const elapsed = Date.now() - start;
            if (isRateLimitError && retries > 0 && elapsed < MAX_TOTAL_TIME_MS) {
                const nextDelay = Math.min(delay * 2, 10_000); // Cap delay at 10s

                if (elapsed + nextDelay > MAX_TOTAL_TIME_MS) {
                    console.warn(`⚠️ [Claude] Skipping retry — would exceed 90s time budget (${elapsed}ms elapsed)`);
                    error.status = 429;
                    throw error;
                }

                console.warn(`⚠️ [Claude] Rate limited (429). Retrying in ${nextDelay}ms... (${retries} retries left, ${elapsed}ms elapsed)`);
                await new Promise((resolve) => setTimeout(resolve, nextDelay));
                return this.withRetry(fn, retries - 1, nextDelay, start);
            }

            if (isRateLimitError) {
                const friendlyError = new Error(
                    'AI tutor is busy right now. Please try again in a minute.'
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
export const claudeService = new ClaudeService();
