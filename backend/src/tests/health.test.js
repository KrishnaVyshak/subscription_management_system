import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../config/db.js', async (importOriginal) => ({ ...(await importOriginal()), query: vi.fn() }));

const { query } = await import('../config/db.js');
const { createApp } = await import('../app.js');

describe('GET /api/health', () => {
  const app = createApp();

  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  it('returns ok with IST time when the database answers', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(res.body.serverTime).toMatch(/\+05:30$/);
    expect(res.body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns 503 when the database is unreachable', async () => {
    vi.mocked(query).mockImplementation(async () => {
      throw new Error('db unreachable');
    });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'down' });
  });
});

describe('unknown API routes', () => {
  it('use the standard error format', async () => {
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
  });
});
