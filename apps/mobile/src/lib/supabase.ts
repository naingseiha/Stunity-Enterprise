import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — used ONLY for Realtime `postgres_changes` subscriptions.
 *
 * Architecture note:
 *   This app uses custom microservice JWTs for all data access (auth-service, feed-service, etc.).
 *   The Supabase client is intentionally anonymous (anon key only) — we never set a Supabase
 *   Auth session because users authenticate against our own backend, not Supabase Auth.
 *
 *   SECURITY: The anonymous client must not have SELECT grants and RLS must remain enabled.
 *   Anonymous postgres_changes subscriptions are expected to receive no protected rows.
 *   Authorized realtime delivery must use a backend-issued Supabase-compatible session or
 *   a backend event channel that applies the same tenant/object authorization as the APIs.
 *
 *   ENV NOTE: These vars are prefixed with EXPO_PUBLIC_ so Metro bakes them into the JS bundle
 *   at build time. This works reliably in EAS builds (unlike react-native-dotenv @env imports).
 */

// process.env.EXPO_PUBLIC_* is inlined by Metro at build time — always available in EAS builds.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to apps/mobile/.env.local (or .env), then restart Expo with --clear.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    // No Supabase Auth session is used (custom JWT backend). Disable idle refresh work.
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 5,
        },
    },
});
