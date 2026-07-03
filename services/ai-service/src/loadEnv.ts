/**
 * Loads environment variables before any other module is evaluated.
 *
 * Must be the FIRST import in index.ts. TypeScript/esbuild hoist all
 * `import` statements above other top-level code, so dotenv.config()
 * calls placed between imports run too late — singletons like
 * claudeService/geminiService read process.env in their constructor,
 * which executes at import time, before those calls would fire.
 * Isolating the config calls in their own side-effect-only module and
 * importing it first guarantees it runs before every other import.
 */
import dotenv from 'dotenv';
import path from 'path';

// Root .env in local dev, Cloud Run env vars in production
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback: also check service-local .env
