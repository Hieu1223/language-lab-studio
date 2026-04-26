import type { ClozeSettings, VideoPlayerSettings } from '../transcription/types';
import type { ReadingMode } from '../manga/types';
import type { PracticeTypeConfig } from '../practice/types';
import type { FlashcardFieldConfig } from '../flashcard/types';

export interface TranscriptionSettings {
  autoScroll: boolean;
  cloze: ClozeSettings;
  videoPlayer: VideoPlayerSettings;
}

export interface MangaSettings {
  readingMode: ReadingMode;
  autoOcr: boolean;
  fitToHeight: boolean;
}

export interface FlashcardSettings {
  dailyNewCards: number;
  autoAudio: boolean;
  fieldConfig: FlashcardFieldConfig[];
}

export interface GrammarSettings {
  dailyNewCards: number;
  reviewMode: 'flashcard' | 'translate';
}

export interface PracticeSettings {
  defaultMode: 'jp-to-vn' | 'vn-to-jp';
  showHints: boolean;
  practiceTypes: PracticeTypeConfig[];
}

export interface CustomServerSettings {
  transcriptServerUrl: string;
  aiApiKey: string;
  useCustomServer: boolean;
}

export interface KeepAliveSettings {
  enabled: boolean;
  intervalMinutes: number;
}

export interface AppSettings {
  transcription: TranscriptionSettings;
  manga: MangaSettings;
  flashcard: FlashcardSettings;
  grammar: GrammarSettings;
  practice: PracticeSettings;
  customServer: CustomServerSettings;
  keepAlive: KeepAliveSettings;
}

export interface SaveSettingsRequest {
  settings: AppSettings;
}

export interface SaveSettingsResponse {
  success: boolean;
  settings: AppSettings;
}

export interface ExportSettingsResponse {
  data: string;
  filename: string;
}
