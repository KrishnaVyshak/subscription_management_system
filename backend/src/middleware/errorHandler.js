import { ZodError } from 'zod';
import { AppError, NotFoundError } from '../lib/errors.js';

const PG_ERRORS = {
  23505: { status: 409, code: 'CONFLICT', message: 'A record with these values already exists' },
  23503: { status: 409, code: 'CONFLICT', message: 'A referenced record is missing or still in use' },
  23514: { status: 400, code: 'VALIDATION_ERROR', message: 'A value is out of range' },
  '22P02': { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input value' },
  22007: { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid date' },
  22008: { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid date' },
};

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

  // Postgres constraint errors that slip past service checks.
  const pgError = PG_ERRORS[err.code];
  if (pgError) {
    return res.status(pgError.status).json({
      error: {
        code: pgError.code,
        message: pgError.message,
        details: { constraint: err.constraint, detail: err.detail },
      },
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  }

  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}
