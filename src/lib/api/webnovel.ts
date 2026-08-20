// Web Novel endpoints (from OpenAPI spec).
import { apiCall } from './client';
import type { components } from './types.gen';

export type WebNovelResponse = components['schemas']['WebNovelResponse'];
export type WebNovelChapterResponse = components['schemas']['WebNovelChapterResponse'];

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
