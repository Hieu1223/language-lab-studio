import type { OCRPage } from '@/lib/api/manga';

/** Reading direction for the manga viewer. */
export type ReadMode = 'single' | 'vertical';

/** Tabs available in the reader's right-hand panel. */
export type PanelTab = 'settings' | 'chapters' | 'text' | 'dictionary' | 'grammar';

/** Identifies a single OCR text block on a specific page. */
export interface SelectedBlock {
  pageIdx: number;
  blockIdx: number;
}

/** User-tweakable reader preferences, persisted to localStorage. */
export interface ReaderSettings {
  readMode: ReadMode;
  showOCRBoxes: boolean;
  boxPadding: number;
  zoom: number;
  autoOpenPanelOnBlock: boolean;
}

export type { OCRPage };

export const SETTINGS_KEY = 'manga-reader-settings-v2';
export const MIN_ZOOM = 50;
export const MAX_ZOOM = 300;
export const ZOOM_STEP = 10;
export const MIN_PADDING = 0;
export const MAX_PADDING = 30;
export const BG_COLOR = '#1a1b26';

export const DEFAULT_SETTINGS: ReaderSettings = {
  readMode: 'single',
  showOCRBoxes: true,
  boxPadding: 0,
  zoom: 100,
  autoOpenPanelOnBlock: true,
};
