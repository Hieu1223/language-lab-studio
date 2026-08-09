import {
  CURRENT_SCHEMA_VERSION,
  DOMAIN_DEFAULTS,
  DOMAIN_SCHEMAS,
  type SettingsDomain,
  type TranscriptionSettings,
  type UserSettings,
} from './schema';
import { migrateSettings } from './migrations';

interface Versioned {
  schemaVersion: number;
  data: Record<string, unknown>;
}

type DomainSettings<D extends SettingsDomain> = D extends 'user'
  ? UserSettings
  : TranscriptionSettings;

/** Unwrap `{ schemaVersion, data }`, tolerating a bare legacy blob. */
function unwrap(input: unknown): { data: Record<string, unknown>; version: number } {
  if (!input || typeof input !== 'object') return { data: {}, version: 0 };
  const candidate = input as Partial<Versioned>;
  if (typeof candidate.schemaVersion === 'number' && candidate.data && typeof candidate.data === 'object') {
    return { data: candidate.data, version: candidate.schemaVersion };
  }
  // Legacy unversioned blob — treat as version 0 and let migrations run.
  return { data: input as Record<string, unknown>, version: 0 };
}

/**
 * Parse + migrate + validate a settings object for a domain.
 *
 * Failure at any step (bad JSON, throwing migration, schema mismatch) falls
 * back to that domain's defaults rather than propagating a broken shape.
 * Because every field in the schema has a default, a partially-valid blob
 * keeps its good fields and only the invalid ones reset.
 */
export function validateOrDefault<D extends SettingsDomain>(
  domain: D,
  input: unknown,
): DomainSettings<D> {
  const schema = DOMAIN_SCHEMAS[domain];
  const defaults = DOMAIN_DEFAULTS[domain] as DomainSettings<D>;

  try {
    const { data, version } = unwrap(input);
    const migrated = version < CURRENT_SCHEMA_VERSION ? migrateSettings(domain, data, version) : data;

    const result = schema.safeParse(migrated);
    if (result.success) return result.data as DomainSettings<D>;

    // Partial recovery: drop only the fields that failed validation, so a
    // single bad value doesn't reset the user's entire configuration.
    const pruned = { ...migrated };
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key === 'string') delete pruned[key];
    }
    const retry = schema.safeParse(pruned);
    return retry.success ? (retry.data as DomainSettings<D>) : defaults;
  } catch {
    return defaults;
  }
}

/** Parse a JSON string through `validateOrDefault`. */
export function parseSettings<D extends SettingsDomain>(
  domain: D,
  raw: string | null,
): DomainSettings<D> {
  if (!raw) return DOMAIN_DEFAULTS[domain] as DomainSettings<D>;
  try {
    return validateOrDefault(domain, JSON.parse(raw));
  } catch {
    return DOMAIN_DEFAULTS[domain] as DomainSettings<D>;
  }
}

/** Wrap settings for persistence — every write carries a `schemaVersion`. */
export function wrapSettings(settings: unknown): Versioned {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    data: settings as Record<string, unknown>,
  };
}

export function serializeSettings(settings: unknown): string {
  return JSON.stringify(wrapSettings(settings));
}
