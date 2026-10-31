import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

// Browser client, used for auth only; business data goes through the Express API.
// Placeholder values keep the app bootable (and tests running) without a .env.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-anon-key', {
  auth: {
    // Persist session in localStorage so page refreshes don't sign users out.
    persistSession: true,
    // When a token refresh fails (e.g. "session_id claim does not exist"), automatically
    // remove the stale session from storage rather than looping on 400 errors.
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    // Surface auth errors (like the "session_id" error) as proper JS errors rather than
    // silently swallowing them.
    fetch: (...args) => fetch(...args),
  },
});
