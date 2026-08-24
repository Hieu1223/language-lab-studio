// Web Novel endpoints (from OpenAPI spec).
import { apiCall } from './client';
import type { components } from './types.gen';

export type WebNovelResponse = components['schemas']['WebNovelResponse'];
export type WebNovelChapterResponse = components['schemas']['WebNovelChapterResponse'];
export type WebNovelReadHistoryResponse = components['schemas']['WebNovelReadHistoryResponse'];
export type WebNovelReadHistoryUpdate = components['schemas']['WebNovelReadHistoryUpdate'];

export interface SearchNovelsParams {
  q: string;
  limit?: number;
  offset?: number;
}

/** GET /web-novel/novels/search — search the web-novel catalog by free-text query. */
export async function searchNovels({
  q,
  limit = 20,
  offset = 0,
}: SearchNovelsParams): Promise<WebNovelResponse[]> {
  return apiCall<WebNovelResponse[]>('/web-novel/novels/search', {
    query: { q, limit, offset },
  });
}

/** GET /web-novel/novels/{novel_id} — fetch full details of a single web novel. */
export async function getNovel(novelId: string): Promise<WebNovelResponse> {
  return apiCall<WebNovelResponse>(`/web-novel/novels/${encodeURIComponent(novelId)}`);
}

/** GET /web-novel/chapters/{chapter_id} — fetch content and metadata of a single chapter. */
export async function readChapter(chapterId: string): Promise<WebNovelChapterResponse> {
  return apiCall<WebNovelChapterResponse>(`/web-novel/chapters/${encodeURIComponent(chapterId)}`);
}

/** GET /web-novel/history — list the current user's reading history. */
export async function getWebNovelHistory(): Promise<WebNovelReadHistoryResponse[]> {
  return apiCall<WebNovelReadHistoryResponse[]>('/web-novel/history');
}

/** POST /web-novel/history — save the current chapter as the user's progress. */
export async function upsertWebNovelHistory(
  update: WebNovelReadHistoryUpdate,
): Promise<WebNovelReadHistoryResponse> {
  return apiCall<WebNovelReadHistoryResponse>('/web-novel/history', {
    method: 'POST',
    body: update,
  });
}

/** DELETE /web-novel/history/{web_novel_id} — remove a novel from history. */
export async function deleteWebNovelHistory(webNovelId: string): Promise<void> {
  await apiCall<void>(`/web-novel/history/${encodeURIComponent(webNovelId)}`, {
    method: 'DELETE',
  });
}
