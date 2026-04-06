import type { AppSettings, ExportSettingsResponse } from './types';
import { getDefaultClozeSettings, getDefaultVideoPlayerSettings } from '../transcription/index';
import { getDefaultPracticeTypeConfig } from '../practice/index';

export type { AppSettings, TranscriptionSettings, MangaSettings, FlashcardSettings, GrammarSettings, PracticeSettings, CustomServerSettings, KeepAliveSettings, ExportSettingsResponse } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function getDefaultSettings(): AppSettings {
  return {
    transcription: {
      autoScroll: true,
      cloze: getDefaultClozeSettings(),
      videoPlayer: getDefaultVideoPlayerSettings(),
    },
    manga: {
      readingMode: 'vertical',
      autoOcr: false,
      fitToHeight: true,
    },
    flashcard: {
      dailyNewCards: 10,
      autoAudio: false,
      fieldConfig: [
        { field: 'front', label: 'Từ', showOnFront: true, showOnBack: true },
        { field: 'reading', label: 'Cách đọc', showOnFront: false, showOnBack: true },
        { field: 'back', label: 'Nghĩa', showOnFront: false, showOnBack: true },
        { field: 'partOfSpeech', label: 'Từ loại', showOnFront: false, showOnBack: true },
      ],
    },
    grammar: {
      dailyNewCards: 5,
      reviewMode: 'flashcard',
    },
    practice: {
      defaultMode: 'jp-to-vn',
      showHints: true,
      practiceTypes: getDefaultPracticeTypeConfig(),
    },
    customServer: {
      transcriptServerUrl: '',
      aiApiKey: '',
      useCustomServer: false,
    },
    keepAlive: {
      enabled: true,
      intervalMinutes: 10,
    },
  };
}

let appSettings: AppSettings = getDefaultSettings();

export async function getSettings(): Promise<AppSettings> {
  await delay(200);
  return { ...appSettings };
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  await delay(300);
  appSettings = { ...settings };
  return { ...appSettings };
}

export async function exportSettings(): Promise<ExportSettingsResponse> {
  await delay(200);
  return {
    data: JSON.stringify(appSettings, null, 2),
    filename: `nihongo-settings-${new Date().toISOString().slice(0, 10)}.json`,
  };
}

export async function importSettings(jsonData: string): Promise<AppSettings> {
  await delay(300);
  const parsed = JSON.parse(jsonData) as AppSettings;
  appSettings = parsed;
  return { ...appSettings };
}

export async function resetSettings(): Promise<AppSettings> {
  await delay(200);
  appSettings = getDefaultSettings();
  return { ...appSettings };
}
