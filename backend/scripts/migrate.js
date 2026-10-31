// Applies supabase/migrations to DATABASE_URL with the Supabase CLI (no `supabase link` needed).
// Usage: npm run db:migrate            (extra args are passed to `supabase db push`)
import { spawnSync } from 'node:child_process';
import { env, rootDir } from '../src/config/env.js';

const result = spawnSync(
  'npx',
  ['supabase', 'db', 'push', '--db-url', env.DATABASE_URL, '--yes', ...process.argv.slice(2)],
  { cwd: rootDir, stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(result.status ?? 1);
