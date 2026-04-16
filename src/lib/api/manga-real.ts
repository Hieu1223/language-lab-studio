import { apiCall } from '../api-client';

export interface MangaInfo {
  name: string;
  cover_url: string;
  manga_url: string;
}

export interface ChapterInfo {
  num: string;
  title: string;
  url: string;
}

export interface OCRBlock {
  box: number[];
  vertical: boolean;
  font_size: number;
  lines_coords: number[][][];
  lines: string[];
}

export interface OCRPage {
  version: string;
  img_width: number;
  img_height: number;
  blocks: OCRBlock[];
}

export interface OCRResponse {
  pages: OCRPage[];
}

// Search for manga
export async function searchManga(query: string | null): Promise<MangaInfo[]> {
  return apiCall<MangaInfo[]>('/manga/search', {
    method: 'GET',
    query: { query: query || '' },
  });
}

// Get chapter list for a manga
export async function getChapterList(mangaUrl: string): Promise<ChapterInfo[]> {
  return apiCall<ChapterInfo[]>('/manga/chapter_list', {
    method: 'GET',
    query: { manga_url: mangaUrl },
  });
}

// Get images for a chapter
export async function getChapterImages(chapterUrl: string): Promise<string[]> {
  return apiCall<string[]>('/manga/read', {
    method: 'GET',
    query: { chapter_url: chapterUrl },
  });
}

// Get OCR data for a chapter
export async function getOCRData(chapterUrl: string): Promise<OCRResponse> {
  return apiCall<OCRResponse>('/manga/ocr_data', {
    method: 'GET',
    query: { chapter_url: chapterUrl },
  });
}
