// localStorage-backed settings used across the app.

export type HighlightMode = 'token' | 'sentence' | 'none';
export type ViewerLayout = 'split-h' | 'split-v' | 'video' | 'transcript';
export type TranscriptionMode = 'study' | 'read' | 'segment-loop';

export interface TranscriptionSettings {
  /** Hide block range [min, max] */
  hiddenRange: [number, number];
  /** Visible block range [min, max] */
  visibleRange: [number, number];
  /** Auto-scroll the transcript to keep current item visible */
  autoScroll: boolean;
  /** Highlight mode for currently-spoken content */
  highlightMode: HighlightMode;
  /** Show cloze (Study) vs raw text (Read) vs segment-loop */
  transcriptionMode: TranscriptionMode;
  /** Layout of the viewer */
  layout: ViewerLayout;
  /** Segment loop mode: padding time (seconds) with audio between segments */
  segmentLoopPadding: number;
  /** Segment loop mode: silent gap (seconds) to indicate loop restart */
  segmentLoopGap: number;
  /** Segment loop mode: number of consecutive segments to display */
  segmentLoopCount: number;
}

export interface MangaSettings {
  showOCR: boolean;
  ocrPages: number[];
  /** Auto-open right drawer when an OCR block is clicked */
  autoOpenPanelOnBlock: boolean;
  /** Show OCR boxes overlay by default */
  showOCRBoxes: boolean;
  /** Default zoom percent for reader */
  zoom: number;
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
  transcriptionMode: 'study',
  layout: 'split-v',
  segmentLoopPadding: 0.5,
  segmentLoopGap: 0.8,
  segmentLoopCount: 2,
};


const DEFAULT_MANGA: MangaSettings = {
  showOCR: false,
  ocrPages: [],
  autoOpenPanelOnBlock: true,
  showOCRBoxes: true,
  zoom: 100,
};

const DEFAULT_SETTINGS: AppSettings = {
  transcription: { ...DEFAULT_TRANSCRIPTION },
  manga: { ...DEFAULT_MANGA },
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
    ...DEFAULT_MANGA,
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
