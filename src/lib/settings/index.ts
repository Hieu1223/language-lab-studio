import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getUserSettings, saveUserSettings } from '@/lib/api/user';
import {
  DEFAULT_TRANSCRIPTION_SETTINGS,
  DEFAULT_USER_SETTINGS,
  type SchedulerSettings,
  type TranscriptionSettings,
  type UserSettings,
} from './schema';
import { parseSettings, validateOrDefault, wrapSettings } from './validateOrDefault';

export * from './schema';
export { validateOrDefault, parseSettings, wrapSettings, serializeSettings } from './validateOrDefault';
export { migrateSettings, MIGRATIONS } from './migrations';

const STORAGE_KEY = 'language-lab-studio-user-settings';

/** Read the cached blob, always through validation. */
export function loadLocalSettings(): UserSettings {
  try {
    return parseSettings('user', localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

/** Cache the blob locally, always versioned. */
export function saveLocalSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapSettings(settings)));
  } catch {
    /* quota / private mode — the server copy remains authoritative */
  }
}

export interface UseUserSettingsResult {
  settings: UserSettings;
  /** Server-confirmed settings; `dirty` is computed against this. */
  saved: UserSettings;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  error: Error | null;
  /** Apply a local patch (live preview); does not hit the network. */
  update: (patch: Partial<UserSettings>) => void;
  /** Persist the whole blob to POST /user/settings. */
  save: () => Promise<void>;
  /** Revert local edits back to the last saved state. */
  reset: () => void;
}

/**
 * User-level settings (doc §5.7).
 *
 * Hydrates from `GET /user/settings`, keeps a local cache for instant boot,
 * and persists the full blob via `POST /user/settings` on an explicit save.
 * Edits are local-only until `save()`, which is what makes `dirty` meaningful
 * for the unsaved-changes guard.
 */
export function useUserSettings(): UseUserSettingsResult {
  const [saved, setSaved] = useState<UserSettings>(loadLocalSettings);
  const [settings, setSettings] = useState<UserSettings>(saved);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Never clobber in-progress edits with a late-arriving server response.
  const editedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    getUserSettings()
      .then((res) => {
        if (cancelled) return;
        const next = validateOrDefault('user', res?.settings ?? {});
        setSaved(next);
        saveLocalSettings(next);
        if (!editedRef.current) setSettings(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<UserSettings>) => {
    editedRef.current = true;
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await saveUserSettings(settings as unknown as Record<string, unknown>);
      // Trust the server's echo so a backend-side normalization is reflected.
      const confirmed = validateOrDefault('user', res?.settings ?? settings);
      setSaved(confirmed);
      setSettings(confirmed);
      saveLocalSettings(confirmed);
      editedRef.current = false;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      setError(wrapped);
      throw wrapped;
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const reset = useCallback(() => {
    editedRef.current = false;
    setSettings(saved);
  }, [saved]);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(saved),
    [settings, saved],
  );

  return { settings, saved, loading, saving, dirty, error, update, save, reset };
}

/** Per-transcription settings blob from `TranscriptDetailResponse`. */
export function readTranscriptionSettings(input: unknown): TranscriptionSettings {
  if (input == null) return DEFAULT_TRANSCRIPTION_SETTINGS;
  return validateOrDefault('transcription', input);
}

export type { SchedulerSettings, TranscriptionSettings, UserSettings };
