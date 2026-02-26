import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("No API key found in .env");
            return;
        }

        console.log("Using API Key starting with:", apiKey.substring(0, 10));

        // Wait, the SDK doesn't expose listModels directly on the main client sometimes.
        // We can just fetch via raw REST to be sure.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        console.log("Available models supporting generateContent:");
        if ((data as any).models) {
            (data as any).models.forEach((m: any) => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log("Error fetching models:", data);
        }
    } catch (e: any) {
        console.error("Failed:", e.message);
    }
}

checkModels();
