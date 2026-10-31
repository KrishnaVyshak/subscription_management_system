import { ZodError } from 'zod';
import { AppError, NotFoundError } from '../lib/errors.js';

export function notFound(req, _res, next) {
  next(new NotFoundError(`No route for ${req.method} ${req.originalUrl}`));
}

// Every error leaves the API as { error: { code, message, details } }.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.issues },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  }

  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}
