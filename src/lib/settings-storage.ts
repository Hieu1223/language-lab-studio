export interface TranscriptionSettings {
  clozeMinGaps: number;
  clozeMaxGaps: number;
  clozeMinChars: number;
  clozeMaxChars: number;
  autoScroll: boolean;
  splitRatio: number;
}

export interface MangaSettings {
  showOCR: boolean;
  ocrPages: number[]; // Page indices with OCR enabled
}

export interface AppSettings {
  transcription: Partial<TranscriptionSettings>;
  manga: Partial<MangaSettings>;
}

const STORAGE_KEY = 'language-lab-studio-settings';

const DEFAULT_SETTINGS: AppSettings = {
  transcription: {
    clozeMinGaps: 2,
    clozeMaxGaps: 5,
    clozeMinChars: 2,
    clozeMaxChars: 5,
    autoScroll: true,
    splitRatio: 50,
  },
  manga: {
    showOCR: false,
    ocrPages: [],
  },
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse settings:', error);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function getTranscriptionSettings(): TranscriptionSettings {
  const settings = loadSettings();
  return {
    ...DEFAULT_SETTINGS.transcription,
    ...(settings.transcription || {}),
  } as TranscriptionSettings;
}

export function setTranscriptionSettings(
  partial: Partial<TranscriptionSettings>
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
  settings.manga = {
    ...getMangaSettings(),
    ...partial,
  };
  saveSettings(settings);
}

export function getAllSettings(): AppSettings {
  return loadSettings();
}

export function clearAllSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
