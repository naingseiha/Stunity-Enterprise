import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase client — used ONLY for Realtime `postgres_changes` subscriptions.
 *
 * Architecture note:
 *   This app uses custom microservice JWTs for all data access (auth-service, feed-service, etc.).
 *   The Supabase client is intentionally anonymous (anon key only) — we never set a Supabase
 *   Auth session because users authenticate against our own backend, not Supabase Auth.
 *
 *   ⚠️  IMPORTANT: Because of this, RLS must be DISABLED on any table that Realtime subscribes to.
 *   If you enable RLS on `posts`, `comments`, etc., Realtime events will be silently dropped
 *   for this anonymous client. Run:
 *     ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
 *     ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
 *
 *   ENV NOTE: These vars are prefixed with EXPO_PUBLIC_ so Metro bakes them into the JS bundle
 *   at build time. This works reliably in EAS builds (unlike react-native-dotenv @env imports).
 */

// process.env.EXPO_PUBLIC_* is inlined by Metro at build time — always available in EAS builds.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});
