import { apiCall, API_BASE_URL, getStoredToken } from '../api-client';

// ────────────────────────────────────────────────────────────────────────────
// Types — mirror the OpenAPI schema exactly
// ────────────────────────────────────────────────────────────────────────────

export interface MangaPreview {
  id: string;
  title: string;
  cover: string | null;
  status: string | null;
}

export interface ChapterPreview {
  id: string;
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

export interface ReadResponse {
  manga: MangaPreview;
  chapter: ChapterPreview;
  chapters: ChapterPreview[];
  pages: string[];
}

/** Shape accepted by POST /manga/history */
export interface ReadHistoryUpdate {
  manga_id: string;
  chapter_id: string;
  current_page?: number;
}

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
  q?: string | null;
  limit?: number;
  offset?: number;
}

/** GET /manga/manga */
export async function searchManga(params: SearchMangaParams = {}): Promise<MangaPreview[]> {
  const { q = null, limit = 20, offset = 0 } = params;
  return apiCall<MangaPreview[]>('/manga/manga', {
    method: 'GET',
    query: { q, limit, offset },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Manga detail
// ────────────────────────────────────────────────────────────────────────────

/** GET /manga/manga/{manga_id} */
export async function getMangaDetail(mangaId: string): Promise<MangaDetail> {
  return apiCall<MangaDetail>(`/manga/manga/${encodeURIComponent(mangaId)}`, {
    method: 'GET',
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Reader  — single call returns manga info, chapter list, and page URLs
// ────────────────────────────────────────────────────────────────────────────

/** GET /manga/read/{chapter_id} */
export async function getChapterRead(chapterId: string): Promise<ReadResponse> {
  return apiCall<ReadResponse>(`/manga/read/${encodeURIComponent(chapterId)}`, {
    method: 'GET',
  });
}

// ────────────────────────────────────────────────────────────────────────────
// OCR (non-streaming)
// ────────────────────────────────────────────────────────────────────────────

/** GET /manga/ocr/{chapter_id} — returns cached OCR result or 404 */
export async function getOCRResult(chapterId: string): Promise<OCRResultResponse> {
  return apiCall<OCRResultResponse>(`/manga/ocr/${encodeURIComponent(chapterId)}`, {
    method: 'GET',
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Streaming OCR
// GET /manga/ocr/stream/{chapter_id}
//   • Backend returns 409 if OCR already exists → caller should use getOCRResult instead
//   • Requires auth (token attached via Authorization header)
// ────────────────────────────────────────────────────────────────────────────

export interface OCRStreamHandle {
  abort: () => void;
}

export function getOCRDataStream(
  chapterId: string,
  onPage: (page: OCRPage) => void,
  onDone?: () => void,
  onError?: (error: Error) => void,
): OCRStreamHandle {
  const url = `${API_BASE_URL}/manga/ocr/stream/${encodeURIComponent(chapterId)}`;
  const controller = new AbortController();

  (async () => {
    try {
      const token = getStoredToken();
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        // 409 = already OCR'd; caller should switch to getOCRResult
        throw new Error(`HTTP ${response.status}`);
      }
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

      if (!finished && buffer.trim().length > 0) {
        if (flushEvent(buffer) === 'done') {
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

  return { abort: () => controller.abort() };
}

// ────────────────────────────────────────────────────────────────────────────
// Reading history
// ────────────────────────────────────────────────────────────────────────────

/** GET /manga/history */
export async function getMangaHistory(): Promise<ReadHistoryResponse[]> {
  return apiCall<ReadHistoryResponse[]>('/manga/history', { method: 'GET' });
}

/**
 * POST /manga/history
 * Only accepts { manga_id, chapter_id, current_page } — all UUIDs.
 */
export async function upsertMangaHistory(data: ReadHistoryUpdate): Promise<ReadHistoryResponse> {
  return apiCall<ReadHistoryResponse>('/manga/history', {
    method: 'POST',
    body: {
      manga_id: data.manga_id,
      chapter_id: data.chapter_id,
      current_page: data.current_page ?? 0,
    },
  });
}