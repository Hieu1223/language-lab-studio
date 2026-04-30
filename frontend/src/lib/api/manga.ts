import { apiCall, API_BASE_URL } from '../api-client';

// ────────────────────────────────────────────────────────────────────────────
// Schemas mirror the backend `openapi.json` (paths under `/manga/*`).
// The manga service is id-based: every manga / chapter is identified by a
// UUID (`manga_id`, `chapter_id`). There is no `manga_url` hack anymore.
// ────────────────────────────────────────────────────────────────────────────

export interface MangaPreview {
  id: string;               // UUID
  title: string;
  cover: string | null;
  status: string | null;
}

export interface ChapterPreview {
  id: string;               // UUID
  title: string;
  chapter_index: number | null;
  date: string | null;
}

export interface MangaDetail extends MangaPreview {
  description: string | null;
  genres: string | null;
  chapters: ChapterPreview[];
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

export interface OCRUserInfo {
  id: string;
  display_name: string | null;
}

export interface OCRResultResponse {
  chapter_id: string;
  ocr_date: string;
  ocr_by: OCRUserInfo | null;
  manga: MangaPreview;
  ocr_data: OCRResponse;
}

/** Response of `GET /manga/read/{chapter_id}` — gives everything the reader
 * needs in one call: manga preview, the current chapter, the whole chapter
 * list and the page image URLs. */
export interface ReadResponse {
  manga: MangaPreview;
  chapter: ChapterPreview;
  chapters: ChapterPreview[];
  pages: string[];
}

/** Body for `POST /manga/history`. */
export interface ReadHistoryUpdate {
  manga_id: string;
  chapter_id: string;
  current_page?: number;
}

/** Schema of each item returned by `GET /manga/history`. */
export interface ReadHistoryResponse {
  id: string;
  current_page: number;
  updated_at: string;
  manga_id: string;
  manga_title: string;
  manga_cover: string | null;
  chapter_id: string;
  chapter_index: number | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Search / browse
// ────────────────────────────────────────────────────────────────────────────

export interface SearchMangaParams {
  /** Free-text query. Empty string (default) returns a curated / all list. */
  q?: string;
  /** Page size, 1-100. */
  limit?: number;
  /** Result offset, for pagination. */
  offset?: number;
}

/**
 * GET /manga/manga?q=&limit=&offset=
 * NOTE: the query string defaults to `''` (empty) — never `null` —
 * matching the "default query is the empty query but not null" rule.
 */
export async function searchManga(
  params: SearchMangaParams = {},
): Promise<MangaPreview[]> {
  const { q = '', limit = 20, offset = 0 } = params;
  return apiCall<MangaPreview[]>('/manga/manga', {
    method: 'GET',
    query: { q, limit, offset },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Manga detail + reader data
// ────────────────────────────────────────────────────────────────────────────

/** GET /manga/manga/{manga_id}. */
export async function getMangaDetail(mangaId: string): Promise<MangaDetail> {
  return apiCall<MangaDetail>(`/manga/manga/${encodeURIComponent(mangaId)}`, {
    method: 'GET',
  });
}

/** GET /manga/read/{chapter_id} — returns manga + chapter + chapters + pages. */
export async function getChapterRead(chapterId: string): Promise<ReadResponse> {
  return apiCall<ReadResponse>(`/manga/read/${encodeURIComponent(chapterId)}`, {
    method: 'GET',
  });
}

/** GET /manga/ocr_data/{chapter_id} — non-streaming fallback. */
export async function getOCRData(chapterId: string): Promise<OCRResponse> {
  return apiCall<OCRResponse>(`/manga/ocr_data/${encodeURIComponent(chapterId)}`, {
    method: 'GET',
  });
}

/** GET /manga/ocr/{chapter_id} — full OCR metadata (who OCR'd etc). */
export async function getOCRResult(chapterId: string): Promise<OCRResultResponse> {
  return apiCall<OCRResultResponse>(`/manga/ocr/${encodeURIComponent(chapterId)}`, {
    method: 'GET',
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Streaming OCR
// ────────────────────────────────────────────────────────────────────────────

export interface OCRStreamHandle {
  /** Aborts the in-flight SSE stream (closes connection). */
  abort: () => void;
}

/**
 * GET /manga/ocr_data/stream/{chapter_id}
 * SSE endpoint that yields one `OCRPage` per `data:` event. A trailing
 * `data: [DONE]` event signals completion.
 *
 * Each received page triggers `onPage` immediately so UIs can render them
 * progressively. Callers receive a handle with an `abort()` method so that
 * navigating away cancels the stream cleanly.
 */
export function getOCRDataStream(
  chapterId: string,
  onPage: (page: OCRPage) => void,
  onDone?: () => void,
  onError?: (error: Error) => void,
): OCRStreamHandle {
  const url = `${API_BASE_URL}/manga/ocr_data/stream/${encodeURIComponent(chapterId)}`;
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'text/event-stream' },
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      const flushEvent = (part: string): 'done' | 'ok' | 'skip' => {
        const dataLines: string[] = [];
        for (const rawLine of part.split(/\r?\n/)) {
          const line = rawLine.trimStart();
          if (!line || line.startsWith(':')) continue;
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        if (dataLines.length === 0) return 'skip';
        const raw = dataLines.join('\n');
        if (raw === '[DONE]') return 'done';
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && 'error' in parsed && parsed.error) {
            onError?.(new Error(String(parsed.error)));
            return 'done';
          }
          onPage(parsed as OCRPage);
          return 'ok';
        } catch {
          console.warn('Failed to parse SSE message:', raw);
          return 'skip';
        }
      };

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (flushEvent(part) === 'done') {
            finished = true;
            onDone?.();
            break;
          }
        }
      }

      // Drain whatever is left if the server didn't terminate with \n\n.
      if (!finished && buffer.trim().length > 0) {
        const res = flushEvent(buffer);
        if (res === 'done') {
          finished = true;
          onDone?.();
        }
      }

      if (!finished) onDone?.();
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  return {
    abort: () => controller.abort(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Reading history
// ────────────────────────────────────────────────────────────────────────────

/** GET /manga/history — returns the authenticated user's reading history. */
export async function getMangaHistory(): Promise<ReadHistoryResponse[]> {
  return apiCall<ReadHistoryResponse[]>('/manga/history', { method: 'GET' });
}

/** POST /manga/history — upsert progress by `(manga_id, chapter_id)`. */
export async function upsertMangaHistory(
  data: ReadHistoryUpdate,
): Promise<ReadHistoryResponse> {
  return apiCall<ReadHistoryResponse>('/manga/history', {
    method: 'POST',
    body: {
      manga_id: data.manga_id,
      chapter_id: data.chapter_id,
      current_page: data.current_page ?? 0,
    },
  });
}
