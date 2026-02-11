import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    return SUPABASE_URL && SUPABASE_ANON_KEY &&
        SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
};

// Create Supabase client instance
export const supabase = isSupabaseConfigured()
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    })
    : null;

// Log configuration status (only in development)
if (import.meta.env.DEV) {
    console.log('Supabase configured:', isSupabaseConfigured());
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured - using localStorage fallback');
    }
}

export default supabase;
