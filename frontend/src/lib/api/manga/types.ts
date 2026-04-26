export interface Manga {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  description: string;
  genres: string[];
  chapterCount: number;
  isSaved: boolean;
  lastRead: string | null;
  lastChapterId: string | null;
}

export interface MangaChapter {
  id: string;
  mangaId: string;
  number: number;
  title: string;
  pageCount: number;
}

export interface MangaPage {
  id: string;
  chapterId: string;
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export type ReadingMode = 'vertical' | 'single' | 'double';

export interface OcrResult {
  pageId: string;
  ocrText: string;
  translation: string;
  words: OcrWord[];
}

export interface OcrWord {
  text: string;
  meaning: string;
  reading: string;
  x: number;
  y: number;
  width: number;
  height: number;
  existsInFlashcards: boolean;
  flashcardId: string | null;
}

export interface MangaChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface MangaChatRequest {
  message: string;
  context: string;
}

export interface MangaChatResponse {
  message: MangaChatMessage;
}
