import { vi } from 'vitest';

// Supabase Auth admin is never called for real in tests.
vi.mock('../config/supabaseAdmin.js', () => import('./helpers/fakeSupabase.js'));
