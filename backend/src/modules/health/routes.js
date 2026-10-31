import { Router } from 'express';
import { query } from '../../config/db.js';
import { nowIST, todayIST } from '../../lib/dates.js';

const router = Router();

router.get('/', async (_req, res) => {
  const body = { serverTime: nowIST(), today: todayIST() };
  try {
    await query('select 1');
    res.json({ status: 'ok', db: 'up', ...body });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down', dbError: err.message || err.code, ...body });
  }
});

export default router;
