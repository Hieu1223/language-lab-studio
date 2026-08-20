// Manga endpoints
// Matches: /manga/* routes from OpenAPI spec
import { apiCall, buildUrl, getStoredToken } from './client';
import type { components } from './types.gen';

// ─── Types ──────────────────────────────────────────────────────────────────

export type MangaPreview = components['schemas']['MangaPreview'];
export type MangaDetail = components['schemas']['MangaDetail'];
export type ChapterPreview = components['schemas']['ChapterPreview'];
export type ReadResponse = components['schemas']['ReadResponse'];
export type OCRBlock = components['schemas']['OCRBlock'];
export type OCRPage = components['schemas']['OCRPage'];
export type OCRResponse = components['schemas']['OCRResponse'];
export type OCRResultResponse = components['schemas']['OCRResultResponse'];
export type OCRUserInfo = components['schemas']['OCRUserInfo'];
export type ReadHistoryResponse = components['schemas']['ReadHistoryResponse'];
export type ReadHistoryUpdate = components['schemas']['ReadHistoryUpdate'];
export type GenrePreview = components['schemas']['GenrePreview'];
export type CreatorPreview = components['schemas']['CreatorPreview'];

// ─── Browse ─────────────────────────────────────────────────────────────────

export type MangaOrder = 'trending' | 'alphabet' | 'views' | 'latest' | 'created';
export type OrderDir = 'asc' | 'desc';

export interface SearchMangaParams {
  q?: string | null;
  genres?: string[] | null;
  author?: string | null;
  order_by?: MangaOrder | null;
  order_dir?: OrderDir | null;
  limit?: number;
  offset?: number;
}

/** GET /manga — List manga with search, filters, pagination */
export async function searchManga({
  q = null,
  genres = null,
  author = null,
  order_by = 'trending',
  order_dir = 'desc',
  limit = 20,
  offset = 0,
}: SearchMangaParams = {}): Promise<MangaPreview[]> {
  return apiCall<MangaPreview[]>('/manga', { 
    query: { q, genres, author, order_by, order_dir, limit, offset } 
  });
}

/** GET /manga/genres — List manga genres */
export async function listGenres(
  q: string | null = null,
  order_by: 'az' | '-az' = 'az',
  limit = 100,
  offset = 0,
): Promise<GenrePreview[]> {
  return apiCall<GenrePreview[]>('/manga/genres', { query: { q, order_by, limit, offset } });
}

/** GET /manga/creators — List manga creators */
export async function listCreators(
  q: string | null = null,
  role: 'author' | 'artist' | null = null,
  order_by: 'az' | '-az' = 'az',
  limit = 100,
  offset = 0,
): Promise<CreatorPreview[]> {
  return apiCall<CreatorPreview[]>('/manga/creators', { query: { q, role, order_by, limit, offset } });
}

/** GET /manga/manga/{manga_id} — Get manga details */
export async function getMangaDetail(mangaId: string): Promise<MangaDetail> {
  return apiCall<MangaDetail>(`/manga/manga/${encodeURIComponent(mangaId)}`);
}

/** GET /manga/read/{chapter_id} — Read chapter */
export async function getChapterRead(chapterId: string): Promise<ReadResponse> {
  return apiCall<ReadResponse>(`/manga/read/${encodeURIComponent(chapterId)}`);
}

// ─── OCR ────────────────────────────────────────────────────────────────────

/** GET /manga/ocr/{chapter_id} — Get OCR result (paginated) */
export async function getOCRResult(
  chapterId: string,
  { offset = 0, limit = 50 }: { offset?: number; limit?: number } = {},
): Promise<OCRResultResponse> {
  return apiCall<OCRResultResponse>(`/manga/ocr/${encodeURIComponent(chapterId)}`, {
    query: { offset, limit },
  });
}

/** DELETE /manga/ocr/{chapter_id} — Reset OCR */
export async function resetOCR(chapterId: string): Promise<void> {
  await apiCall(`/manga/ocr/${encodeURIComponent(chapterId)}`, { method: 'DELETE' });
}

// ─── Reading History ────────────────────────────────────────────────────────

/** GET /manga/history — Get user's reading history */
export async function getMangaHistory(): Promise<ReadHistoryResponse[]> {
  return apiCall<ReadHistoryResponse[]>('/manga/history');
}

/** POST /manga/history — Upsert reading progress */
export async function upsertMangaHistory(update: ReadHistoryUpdate): Promise<ReadHistoryResponse> {
  return apiCall<ReadHistoryResponse>('/manga/history', {
    method: 'POST',
    body: update,
  });
}

/** DELETE /manga/history/{history_id} — Delete history entry */
export async function deleteMangaHistory(historyId: string): Promise<void> {
  await apiCall(`/manga/history/${encodeURIComponent(historyId)}`, { method: 'DELETE' });
}

/** DELETE /manga/history/manga/{manga_id} — Delete all history for a manga */
export async function deleteMangaHistoryByManga(mangaId: string): Promise<void> {
  await apiCall(`/manga/history/manga/${encodeURIComponent(mangaId)}`, { method: 'DELETE' });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize OCR box to 0-1 fractions for responsive overlay */
export interface NormalizedBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function normalizeBox(box: number[], page: Pick<OCRPage, 'img_width' | 'img_height'>): NormalizedBox {
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = box;
  const width = page.img_width || 1;
  const height = page.img_height || 1;
  const left = Math.min(x1, x2) / width;
  const top = Math.min(y1, y2) / height;
  return {
    left,
    top,
    width: Math.abs(x2 - x1) / width,
    height: Math.abs(y2 - y1) / height,
  };
}
