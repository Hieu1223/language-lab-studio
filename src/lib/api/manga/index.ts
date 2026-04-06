import type { Manga, MangaChapter, MangaPage, OcrResult, OcrWord, ReadingMode, MangaChatMessage, MangaChatResponse } from './types';
import { mockMangas, mockChapters, getMockPages, getMockOcrResult } from './mock-data';

export type { Manga, MangaChapter, MangaPage, OcrResult, OcrWord, ReadingMode, MangaChatMessage, MangaChatResponse } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let mangas = [...mockMangas];

export async function getMangaList(): Promise<Manga[]> {
  await delay(300);
  return [...mangas];
}

export async function searchManga(query: string): Promise<Manga[]> {
  await delay(300);
  const q = query.toLowerCase();
  return mangas.filter(m => m.title.toLowerCase().includes(q) || m.author.toLowerCase().includes(q));
}

export async function getMangaDetail(mangaId: string): Promise<Manga> {
  await delay(200);
  const m = mangas.find(m => m.id === mangaId);
  if (!m) throw new Error('Manga not found');
  return m;
}

export async function getMangaChapters(mangaId: string): Promise<MangaChapter[]> {
  await delay(200);
  return mockChapters[mangaId] || [];
}

export async function getChapterPages(chapterId: string): Promise<MangaPage[]> {
  await delay(300);
  return getMockPages(chapterId);
}

export async function ocrMangaPage(pageId: string): Promise<OcrResult> {
  await delay(1000);
  return getMockOcrResult(pageId);
}

export async function toggleMangaSave(mangaId: string): Promise<Manga> {
  await delay(200);
  mangas = mangas.map(m => m.id === mangaId ? { ...m, isSaved: !m.isSaved } : m);
  return mangas.find(m => m.id === mangaId)!;
}

export async function sendMangaChat(message: string, context: string): Promise<MangaChatResponse> {
  await delay(800);
  const response: MangaChatMessage = {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: `Về "${context}": ${message.includes('nghĩa') ? 'Từ này có nghĩa là...' : 'Đây là cách dùng phổ biến trong manga.'}`,
    timestamp: new Date().toISOString(),
  };
  return { message: response };
}

export async function lookupMangaWord(word: string): Promise<{ word: string; reading: string; meaning: string; examples: string[] }> {
  await delay(400);
  return {
    word,
    reading: word,
    meaning: `[nghĩa của "${word}"]`,
    examples: [`${word}を使います。`],
  };
}
