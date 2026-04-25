import { apiCall } from '../api-client';

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

// Search for manga
export async function searchManga(query: string | null): Promise<MangaInfo[]> {
  return apiCall<MangaInfo[]>('/manga/search', {
    method: 'GET',
    query: { query: query || '' },
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

// ─── Mainpage mock (client-side) ──────────────────────────────────────────
// Backend has no mainpage endpoint, so we generate a deterministic mock
// list of popular manga with client-side paging. Only page number is
// exposed — page size is fixed.

const MAINPAGE_POPULAR_QUERIES = [
  'one piece',
  'naruto',
  'attack on titan',
  'demon slayer',
  'jujutsu kaisen',
  'chainsaw man',
];

export const MAINPAGE_PAGE_SIZE = 12;

// Aggregated results cache — fetched once, then paged client-side
let aggregateCache: MangaInfo[] | null = null;
let aggregatePromise: Promise<MangaInfo[]> | null = null;

async function fetchAggregate(): Promise<MangaInfo[]> {
  if (aggregateCache) return aggregateCache;
  if (aggregatePromise) return aggregatePromise;

  aggregatePromise = (async () => {
    // Fire all queries in parallel; swallow individual failures.
    const results = await Promise.all(
      MAINPAGE_POPULAR_QUERIES.map((q) =>
        searchManga(q).catch(() => [] as MangaInfo[]),
      ),
    );

    const seen = new Set<string>();
    const out: MangaInfo[] = [];
    // Interleave first-of-each so the first page feels diverse
    const maxLen = Math.max(...results.map((r) => r.length), 0);
    for (let i = 0; i < maxLen; i++) {
      for (const group of results) {
        const m = group[i];
        if (m && !seen.has(m.manga_url)) {
          seen.add(m.manga_url);
          out.push(m);
        }
      }
    }
    aggregateCache = out;
    return out;
  })();

  try {
    return await aggregatePromise;
  } finally {
    aggregatePromise = null;
  }
}

/**
 * Load mainpage manga list for the given page.
 * Only page number is exposed — page size is fixed.
 */
export async function getMangaMainPage(page: number = 1): Promise<{
  items: MangaInfo[];
  hasMore: boolean;
  page: number;
  totalPages: number;
}> {
  if (page < 1) page = 1;
  const all = await fetchAggregate();
  const totalPages = Math.max(1, Math.ceil(all.length / MAINPAGE_PAGE_SIZE));
  const start = (page - 1) * MAINPAGE_PAGE_SIZE;
  const items = all.slice(start, start + MAINPAGE_PAGE_SIZE);
  return {
    items,
    hasMore: start + items.length < all.length,
    page,
    totalPages,
  };
}

export function clearMangaMainPageCache() {
  aggregateCache = null;
  aggregatePromise = null;
}
