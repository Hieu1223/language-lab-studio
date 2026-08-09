import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { registerTranslator } from "@/lib/i18n-runtime";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enSettings from "./locales/en/settings.json";
import enTranscription from "./locales/en/transcription.json";
import enManga from "./locales/en/manga.json";
import enFlashcard from "./locales/en/flashcard.json";
import enDictionary from "./locales/en/dictionary.json";

import viCommon from "./locales/vi/common.json";
import viAuth from "./locales/vi/auth.json";
import viSettings from "./locales/vi/settings.json";
import viTranscription from "./locales/vi/transcription.json";
import viManga from "./locales/vi/manga.json";
import viFlashcard from "./locales/vi/flashcard.json";
import viDictionary from "./locales/vi/dictionary.json";

export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Namespaces are split per feature area (see doc §3) so a growing catalogue
 * stays navigable and each page only reasons about its own copy.
 */
export const NAMESPACES = [
  "common",
  "auth",
  "settings",
  "transcription",
  "manga",
  "flashcard",
  "dictionary",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

const STORAGE_KEY = "app-locale";

/** The app's copy is authored in Vietnamese, so `vi` is the source of truth. */
export const DEFAULT_LOCALE: Locale = "vi";

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "vi";
}

function detectLocale(): Locale {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved)) return saved;
    }
  } catch {
    /* localStorage can throw in private mode - fall through to defaults */
  }
  if (typeof navigator !== "undefined" && navigator.language?.startsWith("en")) {
    return "en";
  }
  return DEFAULT_LOCALE;
}

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    settings: enSettings,
    transcription: enTranscription,
    manga: enManga,
    flashcard: enFlashcard,
    dictionary: enDictionary,
  },
  vi: {
    common: viCommon,
    auth: viAuth,
    settings: viSettings,
    transcription: viTranscription,
    manga: viManga,
    flashcard: viFlashcard,
    dictionary: viDictionary,
  },
} as const;

const initialLocale = detectLocale();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: "common",
  ns: NAMESPACES as unknown as string[],
  interpolation: { escapeValue: false },
  returnNull: false,
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLocale;
}

// Let non-React modules (api/client.ts, bookmarklet.ts) resolve copy without
// importing this module directly, which would create a circular import.
registerTranslator((key, options) => i18n.t(key, options ?? {}) as string);

/** Persist + apply a locale change (live preview, see doc §5.7). */
export function changeLocale(locale: Locale) {
  void i18n.changeLanguage(locale);
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

/** Current locale, narrowed to a supported value. */
export function getLocale(): Locale {
  return isLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
}

/**
 * BCP-47 tag for `Intl` / `toLocaleDateString` calls, so dates follow the
 * selected UI language instead of a hardcoded `vi-VN`.
 */
export function getDateLocale(): string {
  return getLocale() === "en" ? "en-US" : "vi-VN";
}

export default i18n;
