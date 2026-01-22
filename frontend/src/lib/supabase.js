import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for valid URL format
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://');

if (!isValidUrl || !supabaseAnonKey) {
    console.warn(
        '⚠️ Supabase chưa được cấu hình. Vui lòng cập nhật file .env với thông tin Supabase thực tế.',
        '\n→ VITE_SUPABASE_URL=https://your-project.supabase.co',
        '\n→ VITE_SUPABASE_ANON_KEY=your-anon-key'
    );
}

// Create client only if valid, otherwise create a mock
export const supabase = isValidUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        // Mock client for development without Supabase
        auth: {
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: async () => { throw new Error('Supabase chưa được cấu hình'); },
            signOut: async () => { },
        },
        from: () => ({
            select: () => ({ data: [], error: null }),
            insert: () => ({ data: null, error: new Error('Supabase chưa được cấu hình') }),
            update: () => ({ data: null, error: new Error('Supabase chưa được cấu hình') }),
            delete: () => ({ data: null, error: new Error('Supabase chưa được cấu hình') }),
        }),
    };

// Export config status
export const isSupabaseConfigured = isValidUrl && !!supabaseAnonKey;

