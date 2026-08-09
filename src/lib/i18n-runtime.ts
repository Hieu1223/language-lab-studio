/**
 * Translation access for non-React modules.
 *
 * `useTranslation` is unavailable outside components, and importing the i18n
 * singleton directly from low-level modules such as `lib/api/client.ts` risks a
 * circular import at bootstrap. This indirection lets those modules resolve
 * copy lazily: `@/i18n` registers the real translator on startup, and until
 * then callers fall back to the literal they pass in.
 */

type Translator = (key: string, options?: Record<string, unknown>) => string;

let translator: Translator | null = null;

/** Called once by `@/i18n` after i18next has been initialised. */
export function registerTranslator(fn: Translator): void {
  translator = fn;
}

/**
 * Translate `key`, falling back to `fallback` when i18n is not ready yet.
 *
 * Note: this resolves at call time, so it suits one-shot strings (thrown
 * errors, toasts). Persistent UI must use `useTranslation` so it re-renders
 * when the locale changes.
 */
export function translate(
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
): string {
  if (!translator) return fallback;
  const result = translator(key, options);
  // i18next returns the key itself when a translation is missing.
  return result === key ? fallback : result;
}
