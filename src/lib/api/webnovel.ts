// Web Novel endpoints
// Matches: /web-novel/* routes from OpenAPI spec
import { apiCall } from './client';
import type { components } from './types.gen';

// ─── Types ──────────────────────────────────────────────────────────────────

export type WebNovelResponse = components['schemas']['WebNovelResponse'];
export type WebNovelChapterResponse = components['schemas']['WebNovelChapterResponse'];
export type WebNovelReadHistoryResponse = components['schemas']['WebNovelReadHistoryResponse'];
export type WebNovelReadHistoryUpdate = components['schemas']['WebNovelReadHistoryUpdate'];

// ─── Browse ─────────────────────────────────────────────────────────────────

/** GET /web-novel/novels/search — Search web novel catalog */
export async function searchNovels(
  q: string,
  limit = 20,
  offset = 0,
): Promise<WebNovelResponse[]> {
  return apiCall<WebNovelResponse[]>('/web-novel/novels/search', {
    query: { q, limit, offset },
  });
}

/** GET /web-novel/novels/{novel_id} — Get novel details */
export async function getNovel(novelId: string): Promise<WebNovelResponse> {
  return apiCall<WebNovelResponse>(`/web-novel/novels/${encodeURIComponent(novelId)}`);
}

/** GET /web-novel/chapters/{chapter_id} — Read chapter content */
export async function readChapter(chapterId: string): Promise<WebNovelChapterResponse> {
  return apiCall<WebNovelChapterResponse>(`/web-novel/chapters/${encodeURIComponent(chapterId)}`);
}

// ─── Reading History ────────────────────────────────────────────────────────

/** GET /web-novel/history — Get user's reading history */
export async function getReadingHistory(): Promise<WebNovelReadHistoryResponse[]> {
  return apiCall<WebNovelReadHistoryResponse[]>('/web-novel/history');
}

/** POST /web-novel/history — Upsert reading progress */
export async function upsertReadingHistory(
  update: WebNovelReadHistoryUpdate,
): Promise<WebNovelReadHistoryResponse> {
  return apiCall<WebNovelReadHistoryResponse>('/web-novel/history', {
    method: 'POST',
    body: update,
  });
}

/** DELETE /web-novel/history/{web_novel_id} — Delete history entry */
export async function deleteReadingHistory(webNovelId: string): Promise<void> {
  await apiCall(`/web-novel/history/${encodeURIComponent(webNovelId)}`, {
    method: 'DELETE',
  });
}
