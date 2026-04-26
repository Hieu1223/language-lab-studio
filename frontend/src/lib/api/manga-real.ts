import { apiCall, getStoredToken } from '../api-client';

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

export interface ReadHistoryUpdate {
  manga_url: string;
  current_chapter_url: string;
  current_chapter_name?: string;
}

export interface ReadHistoryResponse {
  id: string;
  user_id: string;
  manga_url: string;
  current_chapter_url: string;
  current_chapter_name?: string;
  updated_at: string;
}

// Search for manga with pagination and sort
export async function searchManga(
  query: string | null,
  page: number = 1,
  sort: string = 'recently_updated'
): Promise<MangaInfo[]> {
  return apiCall<MangaInfo[]>('/manga/search', {
    method: 'GET',
    query: { query: query || '', page, sort },
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

// ─── Manga History ────────────────────────────────────────────────────────

// Update or insert manga reading history
export async function upsertMangaHistory(
  data: ReadHistoryUpdate
): Promise<ReadHistoryResponse> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  return apiCall<ReadHistoryResponse>('/manga/history/upsert', {
    method: 'POST',
    token,
    body: data,
  });
}

// Get user's manga reading history
export async function getMangaHistory(userId: string): Promise<ReadHistoryResponse[]> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const response = await apiCall<{ items: ReadHistoryResponse[] }>(`/manga/history/${userId}`, {
    method: 'GET',
    token,
  });

  return response.items;
}
