// Light/dark theme storage and application.

export type Theme = 'light' | 'dark' | 'system';

const KEY = 'app-theme';

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY) as Theme | null;
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* ignore */ }
  return 'system';
}

export function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return t;
}

export function applyTheme(t: Theme): void {
  const resolved = resolveTheme(t);
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function setTheme(t: Theme): void {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyTheme(t);
}

export function initTheme(): void {
  const t = getStoredTheme();
  applyTheme(t);
  // Listen to system changes when in 'system' mode.
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => {
      if (getStoredTheme() === 'system') applyTheme('system');
    });
  }
}
