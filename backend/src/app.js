import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, isProd, rootDir } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiRouter } from './routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  // The served SPA signs in with Supabase straight from the browser, so allow that origin.
  const csp = {
    directives: { connectSrc: ["'self'", ...(env.SUPABASE_URL ? [env.SUPABASE_URL] : [])] },
  };
  app.use(helmet({ contentSecurityPolicy: isProd ? csp : false }));
  app.use(compression());
  if (!isProd) app.use(cors({ origin: env.APP_URL }));
  app.use(express.json({ limit: '1mb' }));
  if (env.NODE_ENV !== 'test') app.use(morgan(isProd ? 'combined' : 'dev'));

  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      // Dev: generous limit so HMR reloads and React StrictMode double-invocations don't
      // burn through the quota. Test: skip entirely. Prod: tight.
      limit: isProd ? 20 : 200,
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => env.NODE_ENV === 'test',
    }),
  );


  app.use('/api', apiRouter());

  app.use('/api', notFound);

  // In production the same process serves the built React app.
  const distDir = path.join(rootDir, 'frontend', 'dist');
  if (isProd && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.use(errorHandler);

  return app;
}
