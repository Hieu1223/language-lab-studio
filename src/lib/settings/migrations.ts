import { CURRENT_SCHEMA_VERSION, type SettingsDomain } from './schema';

export type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Per-domain migration maps, keyed by the version each step migrates *from*.
 * A step for version `n` must return data valid for version `n + 1`.
 */
export const MIGRATIONS: Record<SettingsDomain, Record<number, MigrationFn>> = {
  user: {
    // 0 -> 1: the initial versioned shape. Unversioned legacy blobs are simply
    // carried forward; zod fills in any fields they were missing.
    0: (data) => ({ ...data }),
  },
  transcription: {
    0: (data) => ({ ...data }),
  },
};

/**
 * Run every migration step from `fromVersion` up to the current version.
 * Throwing is allowed — `validateOrDefault` catches it and falls back.
 */
export function migrateSettings(
  domain: SettingsDomain,
  data: Record<string, unknown>,
  fromVersion: number,
): Record<string, unknown> {
  const steps = MIGRATIONS[domain] ?? {};
  let current = data;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = steps[v];
    if (step) current = step(current);
  }
  return current;
}
