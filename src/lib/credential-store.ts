/**
 * Lightweight credential store for the installed PWA.
 *
 * Keeps the username/password used at sign-in so the app can silently
 * re-authenticate when the access token expires (offline-capable installs are
 * often opened days later, long after the token's lifetime).
 *
 * The value is obfuscated (base64) — this is NOT encryption. It only avoids
 * plain-text credentials sitting in devtools; anyone with device access can
 * still read it, exactly like the bearer token stored next to it.
 */

const CREDS_KEY = 'nihongo-creds';

export interface StoredCredentials {
  username: string;
  password: string;
}

function encode(value: string): string {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return '';
  }
}

function decode(value: string): string {
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return '';
  }
}

export function saveCredentials(username: string, password: string): void {
  try {
    localStorage.setItem(CREDS_KEY, encode(JSON.stringify({ username, password })));
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

export function getCredentials(): StoredCredentials | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(decode(raw)) as StoredCredentials;
    if (!parsed?.username || !parsed?.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(CREDS_KEY);
  } catch {
    /* ignore */
  }
}
