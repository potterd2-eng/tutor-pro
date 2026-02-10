// Supabase Configuration
// Create a Supabase project at https://supabase.com
// Then add your credentials to .env.local

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Instructions:
// 1. Go to https://supabase.com and create a new project
// 2. Copy your project URL and anon key from Settings > API
// 3. Create a .env.local file in the root directory with:
//    VITE_SUPABASE_URL=your_project_url
//    VITE_SUPABASE_ANON_KEY=your_anon_key
