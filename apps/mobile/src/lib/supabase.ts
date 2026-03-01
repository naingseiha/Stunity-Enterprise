import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

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
 */

const supabaseUrl = SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = SUPABASE_ANON_KEY || 'your-anon-key';

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
