import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
const rootEnv = fs.existsSync(rootEnvPath) ? dotenv.parse(fs.readFileSync(rootEnvPath)) : {};
const externalDbUrl = process.env.TEST_DATABASE_URL || rootEnv.TEST_DATABASE_URL || '';

if (externalDbUrl && externalDbUrl === rootEnv.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must not equal DATABASE_URL: tests wipe the test database.');
}

// Without TEST_DATABASE_URL, globalSetup starts a throwaway embedded Postgres on this port.
const EMBEDDED_PORT = 54329;
const testDbUrl =
  externalDbUrl || `postgresql://postgres:postgres@localhost:${EMBEDDED_PORT}/postgres`;

// Read by globalSetup, which runs in this process.
process.env.TEST_DATABASE_URL = testDbUrl;
process.env.TEST_DB_EMBEDDED_PORT = externalDbUrl ? '' : String(EMBEDDED_PORT);

// Integration tests run against a database rebuilt from the migrations on every run.
// Supabase Auth is mocked; JWTs are signed with a test secret.
export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      TZ: 'Asia/Kolkata',
      DATABASE_URL: testDbUrl || 'postgresql://test:test@localhost:5432/test',
      TEST_DATABASE_URL: testDbUrl,
      SUPABASE_URL: 'http://supabase.test',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      SUPABASE_JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-hs256',
      SMTP_HOST: '',
      JOBS_ENABLED: 'false',
      DEMO_MODE: 'true',
    },
    setupFiles: ['src/tests/setup.js'],
    globalSetup: ['src/tests/globalSetup.js'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
