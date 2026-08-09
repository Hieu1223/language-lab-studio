import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { NAMESPACES, SUPPORTED_LOCALES } from '@/i18n';

const LOCALES_DIR = join(process.cwd(), 'src', 'i18n', 'locales');

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function readLocale(locale: string, ns: string): Record<string, Json> {
  const raw = readFileSync(join(LOCALES_DIR, locale, `${ns}.json`), 'utf8');
  return JSON.parse(raw) as Record<string, Json>;
}

/** Flatten to dotted leaf paths so two catalogues can be compared structurally. */
function leafKeys(value: Json, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

/**
 * Mojibake signature: UTF-8 Vietnamese that was decoded as Windows-1252 and
 * re-encoded. This once corrupted five source files, so the catalogue is
 * guarded against a repeat.
 */
const MOJIBAKE = /Ã¡|Ã |áº|á»|Ä‘|â€œ|â€\u009d|Ã©/;

describe('i18n catalogue', () => {
  it('ships a file for every locale x namespace pair', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const files = readdirSync(join(LOCALES_DIR, locale))
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''))
        .sort();
      expect(files).toEqual([...NAMESPACES].sort());
    }
  });

  it.each(NAMESPACES)('has identical keys across locales for "%s"', (ns) => {
    const [reference, ...others] = SUPPORTED_LOCALES;
    const referenceKeys = leafKeys(readLocale(reference, ns)).sort();

    for (const locale of others) {
      const keys = leafKeys(readLocale(locale, ns)).sort();
      const missing = referenceKeys.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !referenceKeys.includes(k));

      expect({ locale, ns, missing, extra }).toEqual({
        locale,
        ns,
        missing: [],
        extra: [],
      });
    }
  });

  it('has no empty translations', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const ns of NAMESPACES) {
        const flat = JSON.stringify(readLocale(locale, ns));
        expect(flat, `${locale}/${ns}.json contains an empty string`).not.toMatch(
          /:\s*""/,
        );
      }
    }
  });

  it('stores catalogues as clean UTF-8 without mojibake or a BOM', () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const ns of NAMESPACES) {
        const path = join(LOCALES_DIR, locale, `${ns}.json`);
        const bytes = readFileSync(path);
        const text = bytes.toString('utf8');

        expect(
          bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf,
          `${locale}/${ns}.json must not start with a UTF-8 BOM`,
        ).toBe(false);

        expect(
          MOJIBAKE.test(text),
          `${locale}/${ns}.json looks mojibake-corrupted`,
        ).toBe(false);
      }
    }
  });

  it('keeps interpolation placeholders consistent across locales', () => {
    const placeholders = (s: string) =>
      (s.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? [])
        .map((p) => p.replace(/[{}\s]/g, ''))
        .sort();

    const flatten = (v: Json, prefix = ''): Array<[string, string]> => {
      if (typeof v === 'string') return [[prefix, v]];
      if (v === null || typeof v !== 'object' || Array.isArray(v)) return [];
      return Object.entries(v).flatMap(([k, val]) =>
        flatten(val, prefix ? `${prefix}.${k}` : k),
      );
    };

    for (const ns of NAMESPACES) {
      const vi = Object.fromEntries(flatten(readLocale('vi', ns)));
      const en = Object.fromEntries(flatten(readLocale('en', ns)));

      for (const [key, viText] of Object.entries(vi)) {
        const enText = en[key];
        if (enText === undefined) continue;
        // i18next plural suffixes legitimately differ per language.
        if (/_(one|other|zero|two|few|many)$/.test(key)) continue;

        expect(
          placeholders(enText),
          `${ns}.${key}: placeholders differ between vi and en`,
        ).toEqual(placeholders(viText));
      }
    }
  });
});
