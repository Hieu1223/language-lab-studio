import { z } from 'zod';

import { translate } from '@/lib/i18n-runtime';

// ─── User-level settings schema (doc §5.7) ──────────────────────────────────
// Every settings blob is versioned with `schemaVersion` and validated with zod.
// The backend stores the blob opaquely, so the frontend owns the whole shape.

export const CURRENT_SCHEMA_VERSION = 1 as const;

export const themeSchema = z.enum(['light', 'dark', 'system']);
export const localeSchema = z.enum(['en', 'vi']);
export const reviewUiSchema = z.enum(['cloze', 'anki']);

/** FSRS step lists are duration strings like '1m' / '10m' / '1d'. */
const stepSchema = z
  .string()
  .regex(
    /^\d+(\.\d+)?[smhd]$/,
    translate('common:errors.durationFormat', 'Expected a duration like 10m'),
  );

export const schedulerSettingsSchema = z.object({
  requestRetention: z.number().min(0.5).max(0.99).default(0.9),
  maximumInterval: z.number().int().positive().default(36500),
  learningSteps: z.array(stepSchema).default(['1m', '10m']),
  relearningSteps: z.array(stepSchema).default(['10m']),
  enableFuzz: z.boolean().default(false),
  enableShortTerm: z.boolean().default(true),
});

export const userSettingsSchema = z.object({
  // Appearance — applied live as a preview, persisted on Save.
  theme: themeSchema.default('system'),
  accentHue: z.number().min(0).max(360).default(265),
  locale: localeSchema.default('vi'),
  // Defaults for new resources.
  defaultReviewUi: reviewUiSchema.default('cloze'),
  reviewBatchSize: z.number().int().min(1).max(100).default(20),
  showVideoByDefault: z.boolean().default(true),
  // FSRS scheduler config (§6.6).
  scheduler: schedulerSettingsSchema.default({}),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
export type SchedulerSettings = z.infer<typeof schedulerSettingsSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type ReviewUiType = z.infer<typeof reviewUiSchema>;

export const DEFAULT_USER_SETTINGS: UserSettings = userSettingsSchema.parse({});
export const DEFAULT_SCHEDULER_SETTINGS: SchedulerSettings = DEFAULT_USER_SETTINGS.scheduler;

// ─── Per-transcription settings (§5.4) ──────────────────────────────────────
// Separate domain, separate lifecycle: new transcripts start from these
// defaults rather than inheriting the last-used transcript's settings.

export const transcriptionSettingsSchema = z.object({
  reviewUi: reviewUiSchema.default('cloze'),
  /** Fraction of tokens the cloze UI hides, 0–1. */
  clozeRatio: z.number().min(0).max(1).default(0.25),
  showFurigana: z.boolean().default(true),
  autoPause: z.boolean().default(false),
  playbackRate: z.number().min(0.25).max(4).default(1),
});

export type TranscriptionSettings = z.infer<typeof transcriptionSettingsSchema>;
export const DEFAULT_TRANSCRIPTION_SETTINGS: TranscriptionSettings =
  transcriptionSettingsSchema.parse({});

// ─── Versioned wrapper ──────────────────────────────────────────────────────

export const versionedSettingsSchema = z.object({
  schemaVersion: z.number().int(),
  data: z.record(z.unknown()),
});

export type VersionedSettings = z.infer<typeof versionedSettingsSchema>;

/** The settings domains that carry independent versions + migrations. */
export type SettingsDomain = 'user' | 'transcription';

export const DOMAIN_SCHEMAS = {
  user: userSettingsSchema,
  transcription: transcriptionSettingsSchema,
} as const;

export const DOMAIN_DEFAULTS = {
  user: DEFAULT_USER_SETTINGS,
  transcription: DEFAULT_TRANSCRIPTION_SETTINGS,
} as const;
