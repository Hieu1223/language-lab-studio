// localStorage-backed settings used across the app.

export type HighlightMode = 'token' | 'sentence' | 'none';
export type ViewerLayout = 'split-h' | 'split-v' | 'video' | 'transcript';

export interface TranscriptionSettings {
  /** Hide block range [min, max] */
  hiddenRange: [number, number];
  /** Visible block range [min, max] */
  visibleRange: [number, number];
  /** Auto-scroll the transcript to keep current item visible */
  autoScroll: boolean;
  /** Highlight mode for currently-spoken content */
  highlightMode: HighlightMode;
  /** Show cloze (Study) vs raw text (Read) */
  showClozeMode: boolean;
  /** Layout of the viewer */
  layout: ViewerLayout;
}

export interface MangaSettings {
  showOCR: boolean;
  ocrPages: number[];
}

export interface AppSettings {
  transcription: Partial<TranscriptionSettings>;
  manga: Partial<MangaSettings>;
}

const STORAGE_KEY = 'language-lab-studio-settings';

const DEFAULT_TRANSCRIPTION: TranscriptionSettings = {
  hiddenRange: [1, 3],
  visibleRange: [2, 5],
  autoScroll: true,
  highlightMode: 'token',
  showClozeMode: true,
  layout: 'split-v',
};


const DEFAULT_SETTINGS: AppSettings = {
  transcription: { ...DEFAULT_TRANSCRIPTION },
  manga: {
    showOCR: false,
    ocrPages: [],
  },
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function getTranscriptionSettings(): TranscriptionSettings {
  const settings = loadSettings();
  const merged = { ...DEFAULT_TRANSCRIPTION, ...(settings.transcription || {}) };
  // Defensive: ensure tuples
  if (!Array.isArray(merged.hiddenRange) || merged.hiddenRange.length !== 2) {
    merged.hiddenRange = DEFAULT_TRANSCRIPTION.hiddenRange;
  }
  if (!Array.isArray(merged.visibleRange) || merged.visibleRange.length !== 2) {
    merged.visibleRange = DEFAULT_TRANSCRIPTION.visibleRange;
  }
  return merged;
}

export function setTranscriptionSettings(
  partial: Partial<TranscriptionSettings>,
): void {
  const settings = loadSettings();
  settings.transcription = {
    ...getTranscriptionSettings(),
    ...partial,
  };
  saveSettings(settings);
}

export function getMangaSettings(): MangaSettings {
  const settings = loadSettings();
  return {
    ...DEFAULT_SETTINGS.manga,
    ...(settings.manga || {}),
  } as MangaSettings;
}

export function setMangaSettings(partial: Partial<MangaSettings>): void {
  const settings = loadSettings();
  settings.manga = { ...getMangaSettings(), ...partial };
  saveSettings(settings);
}

export function getAllSettings(): AppSettings {
  return loadSettings();
}

export function clearAllSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
