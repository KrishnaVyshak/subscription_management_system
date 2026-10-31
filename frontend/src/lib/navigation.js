// Lets non-component code (axios interceptors, the query cache) navigate through the router.
// router.jsx registers router.navigate at startup; before that we fall back to a full page load.
let navigator = (to, { replace = false } = {}) =>
  replace ? window.location.replace(to) : window.location.assign(to);

export function setNavigator(fn) {
  navigator = fn;
}

export function navigateTo(to, options) {
  navigator(to, options);
}

// `/login?next=/app/invoices?page=2`, so a re-login lands where the user was.
export function loginPath(next = window.location.pathname + window.location.search) {
  const safe = next && next.startsWith('/') && !next.startsWith('/login') ? next : '';
  return safe ? `/login?next=${encodeURIComponent(safe)}` : '/login';
}
