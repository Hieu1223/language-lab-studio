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
  manga_name?: string;
  manga_cover_url?: string;
  chapter_url: string;
  chapter_title?: string;
  chapter_num?: string;
  current_page?: number;
}

export interface ReadHistoryResponse {
  id: string;
  user_id: string;
  current_page: number;
  updated_at: string;
  // Manga
  manga_id: string;
  manga_url: string;
  manga_name: string;
  manga_cover_url: string;
  // Chapter
  chapter_id: string;
  chapter_url: string;
  chapter_title: string;
  chapter_num: string;
}

// Search for manga
export async function searchManga(
  query: string | null,
  page: number = 1,
  sort: string = 'recently_updated'
): Promise<MangaInfo[]> {
  return apiCall<MangaInfo[]>('/manga/search', {
    method: 'GET',
    query: {
      query: query || '%20',
      ...(page > 1 ? { page } : {}),
      ...(sort !== 'recently_updated' ? { sort } : {}),
    },
  });
}

// Get chapter list for a manga
export async function getChapterList(mangaUrl: string): Promise<ChapterInfo[]> {
  console.log(mangaUrl);
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

export async function getMangaHistory(userId: string): Promise<ReadHistoryResponse[]> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const response = await apiCall<ReadHistoryResponse[]>(
    `/manga/history/${userId}`,
    {
      method: 'GET',
      token,
    }
  );

  console.log(response);
  return response;
}