import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

let jwks;

// HS256 with SUPABASE_JWT_SECRET when set, otherwise the project's JWKS (asymmetric keys).
function verify(token) {
  if (env.SUPABASE_JWT_SECRET) {
    return jwtVerify(token, new TextEncoder().encode(env.SUPABASE_JWT_SECRET), {
      algorithms: ['HS256'],
    });
  }
  if (!env.SUPABASE_URL) throw new Error('Neither SUPABASE_JWT_SECRET nor SUPABASE_URL is set');
  jwks ??= createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  return jwtVerify(token, jwks);
}

export async function loadUser(profileId) {
  const { rows } = await query(
    `select p.id, p.email, p.full_name, p.role, p.is_active, c.id as customer_id
       from profiles p
       left join customers c on c.profile_id = p.id
      where p.id = $1`,
    [profileId],
  );
  return rows[0] ?? null;
}

// Sets req.user = { id, email, fullName, role, customerId }.
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedError();

    let payload;
    try {
      ({ payload } = await verify(token));
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = payload.sub ? await loadUser(payload.sub) : null;
    if (!user) throw new UnauthorizedError('No profile for this account');
    if (!user.is_active) throw new ForbiddenError('This account is deactivated');

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      customerId: user.customer_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

// Catalog rule: GET for admin and staff, writes for admin only.
export function catalogAccess(req, res, next) {
  const roles = req.method === 'GET' ? ['admin', 'staff'] : ['admin'];
  return requireRole(...roles)(req, res, next);
}
