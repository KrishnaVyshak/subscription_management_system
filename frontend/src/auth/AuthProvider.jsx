import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, setUnauthorizedHandler } from '@/lib/api';
import { loginPath, navigateTo } from '@/lib/navigation';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { AuthContext } from './context';

// `/api/auth/*` is rate limited, so the profile from GET /auth/me is cached for the tab
// and fetched at most once per unique user id per page load.
const CACHE_KEY = 'brightloop-me';

function isMissingAuthSession(error) {
  return /session from session_id claim in jwt does not exist/i.test(error?.message ?? '');
}

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
  } catch {}
}

// Module-level deduplication: only one in-flight /auth/me per userId at any time.
// This protects against React StrictMode double-invocation and concurrent renders.
const inflight = new Map();

function fetchMe(userId) {
  if (inflight.has(userId)) return inflight.get(userId);
  const p = api
    .get('/auth/me', undefined, { skipAuthRefresh: true })
    .then(({ data }) => data)
    .finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
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
  // scope:'local' clears storage without a network request — safe even when the server-side
  // session is already gone (e.g. "session_id claim does not exist" error).
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  if (redirect) navigateTo(redirect, { replace: true });
}

export function AuthProvider({ children }) {
  // undefined = bootstrapping; null = signed out; object = active session.
  const [session, setSession] = useState(undefined);
  const [profile, setProfileState] = useState({ userId: null, me: null, error: null });
  const [recovery, setRecovery] = useState(false);

  // Track the userId we've already kicked off a /auth/me fetch for so StrictMode's
  // double-invocation never fires two requests for the same user.
  const fetchingFor = useRef(null);

  const userId = session?.user?.id ?? null;
  const me = profile.userId === userId ? profile.me : null;
  const meError = profile.userId === userId ? profile.error : null;

  // ─── Session bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    // onAuthStateChange is the single source of truth for session state.
    // Subscribe BEFORE calling getSession so the INITIAL_SESSION event is never missed.
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive) return;

      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true);
        // Don't update session — recovery flow handles itself.
        return;
      }

      // When Supabase invalidates a stored session (e.g. "session_id claim" error),
      // it fires SIGNED_OUT or TOKEN_REFRESHED with a null session. Clear everything.
      if (!next || event === 'SIGNED_OUT') {
        writeCache(null);
        queryClient.clear();
        fetchingFor.current = null;
        setSession(null);
        return;
      }

      setSession(next);
    });

    // getSession reads localStorage synchronously — no network call. Its only job here
    // is to set the initial state quickly before the first INITIAL_SESSION event arrives.
    // We DON'T call setSession from both places: the authStateChange handler above will
    // also fire with INITIAL_SESSION, so we use getSession purely for the initial null→session
    // transition to avoid the FullPageSpinner showing for one extra render cycle.
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      // If still undefined (no auth event yet), seed the state from localStorage.
      setSession((prev) => (prev === undefined ? (data.session ?? null) : prev));
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ─── Profile fetch ────────────────────────────────────────────────────────
  // Fires only when userId changes AND we don't already have a profile for that user.
  useEffect(() => {
    if (!userId || me || meError) return;
    // Guard against StrictMode double-invocation and fast session flips.
    if (fetchingFor.current === userId) return;
    fetchingFor.current = userId;

    let alive = true;
    loadProfile(userId).then(
      (p) => {
        if (!alive) return;
        setProfileState({ userId, me: p, error: null });
      },
      (err) => {
        if (!alive) return;
        fetchingFor.current = null; // allow retry after error
        if (err?.status === 401) {
          // Token was rejected even after refresh — clear everything and go to login.
          endSession(loginPath());
        } else {
          setProfileState({ userId, me: null, error: err });
        }
      },
    );

    return () => {
      alive = false;
    };
  }, [userId, me, meError]);

  // ─── Global 401 handler ───────────────────────────────────────────────────
  useEffect(() => {
    setUnauthorizedHandler(() => endSession(loginPath()));
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const signOut = useCallback(({ redirect } = {}) => endSession(redirect), []);

  const signIn = useCallback(async (email, password) => {
    let result = await supabase.auth.signInWithPassword({ email, password });
    // A deleted/revoked Supabase session can remain in local storage and interfere with
    // auth requests. Clear only the local copy, then retry the user's explicit login once.
    if (result.error && isMissingAuthSession(result.error)) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    const { data, error } = result;
    if (error) throw error;
    try {
      // Force-fetch the profile immediately so the redirect can use role information.
      const p = await loadProfile(data.user.id, { force: true });
      fetchingFor.current = data.user.id;
      setProfileState({ userId: data.user.id, me: p, error: null });
      setSession(data.session);
      return p;
    } catch (err) {
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

  const setProfile = useCallback((patch) => {
    setProfileState((prev) => {
      if (!prev.me) return prev;
      const next = { ...prev.me, ...patch };
      writeCache(next);
      return { ...prev, me: next };
    });
  }, []);

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
