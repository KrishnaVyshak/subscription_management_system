import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { AppError } from '../lib/errors.js';

let client;

// Service-role client, used only for Auth admin calls (create user, update password).
export function supabaseAdmin() {
  if (!client) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new AppError(500, 'CONFIG_ERROR', 'Supabase admin credentials are not configured');
    }
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
