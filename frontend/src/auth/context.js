import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/** { session, user, role, customerId, loading, error, signIn, signOut, refreshMe, setProfile } */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const STAFF_ROLES = ['admin', 'staff'];

/** Where each role lands after sign-in or on `/`. */
export function homeFor(role) {
  return role === 'customer' ? '/portal' : '/app/dashboard';
}

/** A `next` URL is honoured only if this role may open it. */
export function safeNext(next, role) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  if (next.startsWith('/app') && !STAFF_ROLES.includes(role)) return null;
  if (next.startsWith('/portal') && role !== 'customer') return null;
  return next;
}

/** True for admins; staff see catalog and settings read-only. */
export function useCanEdit() {
  return useAuth().role === 'admin';
}
