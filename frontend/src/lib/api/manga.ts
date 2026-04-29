import { apiCall, getStoredToken, API_BASE_URL } from '../api-client';

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



export interface OCRStreamHandle {
  /** Aborts the in-flight stream (closes connection). */
  abort: () => void;
}

/**
 * Streams OCR pages from the backend one-by-one via SSE.
 * Each `data: { ...OCRPage }` line triggers `onPage`.
 * A `data: [DONE]` line triggers `onDone` and ends the stream.
 *
 * Returns a handle that can be used to cancel the stream (e.g. on unmount
 * or when navigating to a new chapter).
 */
export function getOCRDataStream(
  chapterUrl: string,
  onPage: (page: OCRPage) => void,
  onDone?: () => void,
  onError?: (error: Error) => void
): OCRStreamHandle {
  const params = new URLSearchParams({ chapter_url: chapterUrl });
  const url = `${API_BASE_URL}/manga/ocr_data/stream?${params}`;

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

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line. Be tolerant to \r\n.
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          // An SSE event may have multiple `data:` lines. Concatenate them.
          const dataLines: string[] = [];
          for (const rawLine of part.split(/\r?\n/)) {
            const line = rawLine.trimStart();
            if (!line || line.startsWith(':')) continue; // comment / heartbeat
            if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trimStart());
            }
          }
          if (dataLines.length === 0) continue;
          const raw = dataLines.join('\n');

          if (raw === '[DONE]') {
            finished = true;
            onDone?.();
            break;
          }

          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && 'error' in parsed && parsed.error) {
              onError?.(new Error(String(parsed.error)));
              finished = true;
              break;
            }
            onPage(parsed as OCRPage);
          } catch {
            console.warn('Failed to parse SSE message:', raw);
          }
        }
      }

      // Drain whatever is left in `buffer` if server closed without trailing \n\n.
      if (buffer.trim().length > 0) {
        const dataLines: string[] = [];
        for (const rawLine of buffer.split(/\r?\n/)) {
          const line = rawLine.trimStart();
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        const raw = dataLines.join('\n');
        if (raw && raw !== '[DONE]') {
          try {
            const parsed = JSON.parse(raw);
            if (!parsed.error) onPage(parsed as OCRPage);
          } catch {
            /* ignore */
          }
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


