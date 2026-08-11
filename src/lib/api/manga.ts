// Manga endpoints (doc §5.5).
import { apiCall, buildUrl, getStoredToken } from './client';
import type { components } from './types.gen';

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

// ─── Browse ─────────────────────────────────────────────────────────────────

export type MangaOrder = 'latest' | '-latest' | 'az' | '-az' | 'created' | '-created';

export interface SearchMangaParams {
  q?: string | null;
  tags?: string[];
  order_by?: MangaOrder | null;
  limit?: number;
  offset?: number;
}

/** GET /manga/manga */
export async function searchManga({
  q = null,
  tags = [],
  order_by = null,
  limit = 20,
  offset = 0,
}: SearchMangaParams = {}): Promise<MangaPreview[]> {
  return apiCall<MangaPreview[]>('/manga/manga', { query: { q, tags, order_by, limit, offset } });
}

/** GET /manga/tags — prefix lookup for the browse filter. */
export async function searchMangaTags(q: string, limit = 5): Promise<string[]> {
  return apiCall<string[]>('/manga/tags', { query: { q, order_by: 'az', limit, offset: 0 } });
}

/** GET /manga/manga/{manga_id} */
export async function getMangaDetail(mangaId: string): Promise<MangaDetail> {
  return apiCall<MangaDetail>(`/manga/manga/${encodeURIComponent(mangaId)}`);
}

/** GET /manga/read/{chapter_id} — pages plus sibling chapters for nav. */
export async function getChapterRead(chapterId: string): Promise<ReadResponse> {
  return apiCall<ReadResponse>(`/manga/read/${encodeURIComponent(chapterId)}`);
}

// ─── OCR ────────────────────────────────────────────────────────────────────

/**
 * GET /manga/ocr/{chapter_id} — already-computed results (404 when absent).
 * Paginated by page: pass `offset`/`limit` so the reader only pulls the pages
 * it is actually showing instead of a whole chapter's OCR payload.
 */
export async function getOCRResult(
  chapterId: string,
  { offset = 0, limit = 50 }: { offset?: number; limit?: number } = {},
): Promise<OCRResultResponse> {
  return apiCall<OCRResultResponse>(`/manga/ocr/${encodeURIComponent(chapterId)}`, {
    query: { offset, limit },
  });
}

/** DELETE /manga/ocr/{chapter_id} — reset so OCR can be re-run. */
export async function resetOCR(chapterId: string): Promise<void> {
  await apiCall(`/manga/ocr/${encodeURIComponent(chapterId)}`, { method: 'DELETE' });
}

export interface OCRStreamHandle {
  abort: () => void;
}

export interface OCRStreamCallbacks {
  onPage: (page: OCRPage, index: number) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

/**
 * GET /manga/ocr/stream/{chapter_id} — SSE-style "run OCR now" with live
 * progress. Returns a handle whose `abort()` MUST be called on unmount or
 * chapter change (§6.7.4), otherwise a stale stream can populate the overlay
 * for a page the user already navigated away from.
 *
 * The backend answers 409 when OCR already exists — callers should fall back
 * to `getOCRResult` in that case.
 */
export function streamOCR(
  chapterId: string,
  { onPage, onDone, onError }: OCRStreamCallbacks,
): OCRStreamHandle {
  const controller = new AbortController();

  void (async () => {
    let pageIndex = 0;
    try {
      const token = getStoredToken();
      const response = await fetch(
        buildUrl(`/manga/ocr/stream/${encodeURIComponent(chapterId)}`),
        {
          signal: controller.signal,
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      /** Parse one SSE event block. Returns 'done' to stop the loop. */
      const handleEvent = (block: string): 'done' | 'ok' | 'skip' => {
        const dataLines: string[] = [];
        for (const rawLine of block.split(/\r?\n/)) {
          const line = rawLine.trimStart();
          if (!line || line.startsWith(':')) continue;
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
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
          onPage(parsed as OCRPage, pageIndex++);
          return 'ok';
        } catch {
          return 'skip';
        }
      };

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          if (handleEvent(block) === 'done') {
            finished = true;
            break;
          }
        }
      }

      if (!finished && buffer.trim()) handleEvent(buffer);
      onDone?.();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if ((err as Error)?.name === 'AbortError') return;
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return { abort: () => controller.abort() };
}

/**
 * Convert an OCR block's pixel `box` into normalized 0–1 fractions so the
 * overlay repositions under zoom/pan via CSS alone (§5.5, checklist §9).
 * `box` is [x1, y1, x2, y2] in the source image's pixel space.
 */
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

// ─── Reading history ────────────────────────────────────────────────────────

/** GET /manga/history */
export async function getMangaHistory(): Promise<ReadHistoryResponse[]> {
  return apiCall<ReadHistoryResponse[]>('/manga/history');
}

/** POST /manga/history — upsert keyed by manga + chapter. */
export async function upsertMangaHistory(
  update: ReadHistoryUpdate,
): Promise<ReadHistoryResponse> {
  return apiCall<ReadHistoryResponse>('/manga/history', {
    method: 'POST',
    body: {
      manga_id: update.manga_id,
      chapter_id: update.chapter_id,
      current_page: update.current_page ?? 0,
    } satisfies ReadHistoryUpdate,
  });
}

/** DELETE /manga/history/{history_id} */
export async function deleteMangaHistory(historyId: string): Promise<void> {
  await apiCall(`/manga/history/${encodeURIComponent(historyId)}`, { method: 'DELETE' });
}

/** DELETE /manga/history/manga/{manga_id} — clear all history for one manga. */
export async function deleteMangaHistoryByManga(mangaId: string): Promise<void> {
  await apiCall(`/manga/history/manga/${encodeURIComponent(mangaId)}`, { method: 'DELETE' });
}
