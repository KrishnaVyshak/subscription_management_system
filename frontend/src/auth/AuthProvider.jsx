import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '@/lib/api';
import { loginPath, navigateTo } from '@/lib/navigation';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { AuthContext } from './context';

// `/api/auth/*` is rate limited (20 req / 15 min, docs/BACKEND_ISSUES.md #2), so the profile from
// GET /auth/me is cached for the tab and fetched once per signed-in user.
const CACHE_KEY = 'brightloop-me';

function readCache(userId) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
    return cached?.id === userId ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(me) {
  try {
    if (me) sessionStorage.setItem(CACHE_KEY, JSON.stringify(me));
    else sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Storage unavailable: the profile is simply fetched again next load.
  }
}

// One in-flight /auth/me per user, shared by sign-in and the session effect.
const pending = new Map();
function fetchMe(userId) {
  if (!pending.has(userId)) {
    const p = api
      .get('/auth/me', undefined, { skipAuthRefresh: true })
      .then(({ data }) => data)
      .finally(() => setTimeout(() => pending.delete(userId), 0));
    pending.set(userId, p);
  }
  return pending.get(userId);
}

async function loadProfile(userId, { force = false } = {}) {
  const cached = !force && readCache(userId);
  if (cached) return cached;
  const profile = await fetchMe(userId);
  writeCache(profile);
  return profile;
}

async function endSession(redirect) {
  writeCache(null);
  queryClient.clear();
  await supabase.auth.signOut().catch(() => {});
  if (redirect) navigateTo(redirect, { replace: true });
}

export function AuthProvider({ children }) {
  // undefined = still reading the stored session; null = signed out.
  const [session, setSession] = useState(undefined);
  // The profile (or the error loading it) is stored with the user id it belongs to, so a
  // different user's session never shows a stale profile.
  const [profile, setProfileState] = useState({ userId: null, me: null, error: null });
  const [recovery, setRecovery] = useState(false);
  const userId = session?.user?.id ?? null;
  const me = profile.userId === userId ? profile.me : null;
  const meError = profile.userId === userId ? profile.error : null;

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(next ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId || me || meError) return undefined;
    let alive = true;
    loadProfile(userId).then(
      (p) => alive && setProfileState({ userId, me: p, error: null }),
      (err) => {
        if (!alive) return;
        // A stored session the API no longer accepts (expired, no profile): start over.
        if (err?.status === 401) endSession();
        else setProfileState({ userId, me: null, error: err });
      },
    );
    return () => {
      alive = false;
    };
  }, [userId, me, meError]);

  const signOut = useCallback(({ redirect } = {}) => endSession(redirect), []);

  useEffect(() => {
    // A token the API still refuses after a refresh: end the session and ask to sign in again.
    setUnauthorizedHandler(() => endSession(loginPath()));
  }, []);

  /** Signs in and returns the profile, so the caller can redirect by role. */
  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    try {
      const p = await loadProfile(data.user.id, { force: true });
      setProfileState({ userId: data.user.id, me: p, error: null });
      setSession(data.session);
      return p;
    } catch (err) {
      // No profile, or a deactivated account: don't leave a half-signed-in session behind.
      await endSession();
      throw err;
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!userId) return null;
    try {
      const p = await loadProfile(userId, { force: true });
      setProfileState({ userId, me: p, error: null });
      return p;
    } catch (err) {
      setProfileState({ userId, me: null, error: err });
      throw err;
    }
  }, [userId]);

  const setProfile = useCallback(
    (patch) =>
      setProfileState((prev) => {
        if (!prev.me) return prev;
        const next = { ...prev.me, ...patch };
        writeCache(next);
        return { ...prev, me: next };
      }),
    [],
  );

  const value = useMemo(
    () => ({
      session,
      user: me,
      role: me?.role ?? null,
      customerId: me?.customerId ?? null,
      loading: session === undefined || Boolean(userId && !me && !meError),
      error: meError,
      recovery,
      signIn,
      signOut,
      refreshMe,
      setProfile,
    }),
    [session, me, meError, userId, recovery, signIn, signOut, refreshMe, setProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
