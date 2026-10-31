import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

// Browser client, used for auth only; business data goes through the Express API.
// Placeholder values keep the app bootable (and tests running) without a .env.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key');
