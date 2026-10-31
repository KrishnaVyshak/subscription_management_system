import { afterAll, beforeEach, describe } from 'vitest';
import { pool, query } from '../../config/db.js';
import { resetFakeAuth } from './fakeSupabase.js';

// Integration suites: describeDb('...', () => { useDb(); ... }). The database is
// TEST_DATABASE_URL or, when unset, the embedded Postgres started by globalSetup.
export const describeDb = describe;

export async function resetDb() {
  await query(`
    do $$
    declare t text;
    begin
      select string_agg(format('public.%I', tablename), ', ') into t
        from pg_tables where schemaname = 'public' and tablename <> 'settings';
      if t is not null then execute 'truncate ' || t || ' restart identity cascade'; end if;
    end $$;
  `);
  await query(`update settings set value = 'true' where key = 'invoice.auto_confirm'`);
  resetFakeAuth();
}

// Call once per integration test file, inside describeDb.
export function useDb() {
  beforeEach(resetDb);
  afterAll(() => pool.end());
}
