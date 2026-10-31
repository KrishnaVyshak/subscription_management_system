import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations',
);

let embedded;
let embeddedDir;

// pg_ctl from the embedded-postgres binaries; used to stop a server reliably on Windows.
async function pgCtl(...args) {
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const { pg_ctl: bin } = await import(`@embedded-postgres/${platform}-${process.arch}`);
  try {
    execFileSync(bin, args, { stdio: 'ignore', timeout: 20_000 });
  } catch {
    // Not running.
  }
}

async function startEmbedded(port) {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  embeddedDir = path.join(os.tmpdir(), 'brightloop-test-pg');
  if (fs.existsSync(embeddedDir)) {
    await pgCtl('stop', '-D', embeddedDir, '-m', 'immediate');
    fs.rmSync(embeddedDir, { recursive: true, force: true });
  }
  embedded = new EmbeddedPostgres({
    databaseDir: embeddedDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    onLog: () => {},
  });
  await embedded.initialise();
  await embedded.start();
}

async function applyMigrations(url) {
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const client = new pg.Client({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query('drop schema if exists public cascade');
    await client.query('create schema public');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      try {
        await client.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      } catch (err) {
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    await client.end();
  }
}

// Starts the embedded server when no TEST_DATABASE_URL was given, then rebuilds the
// public schema from supabase/migrations once per test run.
export default async function setup() {
  const port = process.env.TEST_DB_EMBEDDED_PORT;
  if (port) await startEmbedded(Number(port));
  await applyMigrations(process.env.TEST_DATABASE_URL);

  return async function teardown() {
    if (!embedded) return;
    await pgCtl('stop', '-D', embeddedDir, '-m', 'fast');
    // embedded.stop() can hang on Windows; pg_ctl already stopped the server.
    await Promise.race([embedded.stop().catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
    fs.rmSync(embeddedDir, { recursive: true, force: true });
  };
}
