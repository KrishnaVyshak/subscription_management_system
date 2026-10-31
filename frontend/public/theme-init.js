// Applies the saved theme before first paint so dark mode doesn't flash. Mirrors
// src/hooks/use-theme.js. A same-origin file (not inline) so it passes the production CSP.
try {
  var t = localStorage.getItem('brightloop-theme');
  if (t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch {
  // Storage blocked (private mode): keep the default theme.
}
