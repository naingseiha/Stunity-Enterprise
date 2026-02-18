import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Create a single supabase client for interacting with your database
// If env vars are missing, it will throw an error or fail silently depending on config
// For now, we'll add a fallback for development if keys aren't set yet

const supabaseUrl = SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
