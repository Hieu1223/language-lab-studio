import { apiCall, getStoredToken } from '../api-client';

// Status codes from the backend transcription pipeline.
// 0 = queued, 1 = downloading, 2 = transcribing, 3 = ready, 4 = error
export const TRANSCRIPT_STATUS = {
  QUEUED: 0,
  DOWNLOADING: 1,
  TRANSCRIBING: 2,
  READY: 3,
  ERROR: 4,
} as const;

export type TranscriptStatusCode = (typeof TRANSCRIPT_STATUS)[keyof typeof TRANSCRIPT_STATUS];

export function isTranscriptReady(status: number): boolean {
  return status === TRANSCRIPT_STATUS.READY;
}

export function isTranscriptError(status: number): boolean {
  return status === TRANSCRIPT_STATUS.ERROR;
}

export function describeTranscriptStatus(status: number): string {
  switch (status) {
    case TRANSCRIPT_STATUS.QUEUED:
      return 'Đang xếp hàng';
    case TRANSCRIPT_STATUS.DOWNLOADING:
      return 'Đang tải nguồn';
    case TRANSCRIPT_STATUS.TRANSCRIBING:
      return 'Đang phiên dịch';
    case TRANSCRIPT_STATUS.READY:
      return 'Sẵn sàng';
    case TRANSCRIPT_STATUS.ERROR:
      return 'Lỗi';
    default:
      return `Trạng thái ${status}`;
  }
}

export interface VideoPreview {
  id: string;
  title: string;
  thumbnail_url: string | null;
  channel: {
    id: string;
    name: string | null;
    url: string | null;
  };
  duration: string | null;
  description: string | null;
  view_count: number | null;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail_url: string;
  channel: {
    id: string;
    name: string | null;
    url: string | null;
    follower_count: number | null;
    is_verified: boolean | null;
    description: string | null;
  };
  duration: number;
  view_count: number;
  upload_date: string | null;
  description: string | null;
}

export interface TranscriptSegment {
  text: string;
  words: Array<{
    token: string;
    start: number | null;
    end: number | null;
  }>;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
}

export interface TranscriptInfo {
  id: string;
  original_source: string;
  thumnail_url: string;
  resource_url: string;
  resource_id: string | null;
  status: number;
}

export interface UserHistoryItem {
  history_id: string;
  transcript_id: string;
  name: string;
  thumbnail_url: string;
  original_source: string;
  date_created: string;
  status: number;
}

// Search YouTube videos
export async function searchYouTube(query: string, limit: number = 10): Promise<VideoPreview[]> {
  return apiCall<VideoPreview[]>('/youtube/search', {
    method: 'GET',
    query: { q: query, limit },
  });
}

// Get YouTube video info
export async function getYouTubeVideo(videoId: string): Promise<VideoInfo> {
  return apiCall<VideoInfo>(`/youtube/video/${videoId}`, {
    method: 'GET',
  });
}

// Request transcription from YouTube
export async function requestTranscription(
  youtubeUrl: string,
  videoId: string,
  title: string,
  thumbnailUrl: string,
  userId: string,
  token?: string,
  isPublic: boolean = true
): Promise<{ transcript_id: string; success: boolean }> {
  const authToken = token || getStoredToken();
  if (!authToken) throw new Error('Not authenticated');

  console.log(
     {
        name: title,
        resource_id: videoId,
        original_source: 'Youtube',
        public: isPublic,
        thumbnail_url: thumbnailUrl,
        resource_url: youtubeUrl,
        user_id: userId,
      }
  )
  return apiCall<{ transcript_id: string; success: boolean }>(
    '/transcription/transcribe/youtube',
    {
      method: 'POST',
      token: authToken,
      body: {
        name: title,
        resource_id: videoId,
        original_source: 'Youtube',
        public: isPublic,
        thumbnail_url: thumbnailUrl,
        resource_url: youtubeUrl,
        user_id: userId,
      },
    }
  );
}

// Get transcript info
export async function getTranscriptInfo(
  transcriptId: string
): Promise<TranscriptInfo | null> {
  return apiCall<TranscriptInfo | null>(
    `/transcription/transcribe/${transcriptId}/info`,
    {
      method: 'GET',
    }
  );
}

/**
 * Fill in missing (null) word timestamps by linear interpolation.
 *
 * The backend can return tokens without `start`/`end` (punctuation, merged
 * tokens, ASR gaps). We flatten every word across all segments, then for each
 * run of unknown timestamps we spread the gap evenly between the previous
 * known end and the next known start. Leading/trailing unknowns are clamped
 * to the first/last known value.
 */
export function interpolateTranscript(result: TranscriptResult): TranscriptResult {
  const flat: Array<{ token: string; start: number | null; end: number | null }> = [];
  for (const seg of result.segments ?? []) {
    for (const w of seg.words ?? []) flat.push(w);
  }
  if (flat.length === 0) return result;

  // Anchors: index -> known [start, end]
  const known = flat.map((w) =>
    w.start !== null || w.end !== null
      ? { start: w.start ?? w.end!, end: w.end ?? w.start! }
      : null,
  );

  const firstKnownIdx = known.findIndex((k) => k !== null);
  if (firstKnownIdx === -1) return result;
  const lastKnownIdx = known.length - 1 - [...known].reverse().findIndex((k) => k !== null);

  for (let i = 0; i < known.length; i++) {
    if (known[i]) continue;

    if (i < firstKnownIdx) {
      const t = known[firstKnownIdx]!.start;
      known[i] = { start: t, end: t };
      continue;
    }
    if (i > lastKnownIdx) {
      const t = known[lastKnownIdx]!.end;
      known[i] = { start: t, end: t };
      continue;
    }

    // Find the run of unknowns [i, j)
    let j = i;
    while (j < known.length && !known[j]) j++;
    const prevEnd = known[i - 1]!.end;
    const nextStart = known[j]!.start;
    const count = j - i;
    const span = Math.max(0, nextStart - prevEnd);
    const step = span / (count + 1);
    for (let k = 0; k < count; k++) {
      const start = prevEnd + step * k;
      const end = prevEnd + step * (k + 1);
      known[i + k] = { start, end };
    }
    i = j - 1;
  }

  let idx = 0;
  return {
    ...result,
    segments: (result.segments ?? []).map((seg) => ({
      ...seg,
      words: (seg.words ?? []).map((w) => {
        const k = known[idx++]!;
        return { ...w, start: k.start, end: k.end };
      }),
    })),
  };
}

// Get transcript data
export async function getTranscriptData(
  transcriptId: string
): Promise<TranscriptResult | null> {
  const data = await apiCall<TranscriptResult | null>(
    `/transcription/transcribe/${transcriptId}/data`,
    {
      method: 'GET',
    }
  );
  if (!data || !Array.isArray(data.segments)) return data;
  return interpolateTranscript(data);
}


// Get user's transcription history
export async function getTranscriptionHistory(): Promise<UserHistoryItem[]> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  const response = await apiCall<{ items: UserHistoryItem[]; total: number }>(
    '/transcription/history',
    {
      method: 'GET',
      token,
    }
  );

  return response.items;
}

// Delete transcription history entry
export async function deleteTranscriptionHistory(historyId: string): Promise<void> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  await apiCall('/transcription/history', {
    method: 'DELETE',
    token,
    body: { history_id: historyId },
  });
}

// List public transcripts (paginated)
export async function listPublicTranscripts(
  page: number = 1,
  pageSize: number = 50,
): Promise<TranscriptInfo[]> {
  return apiCall<TranscriptInfo[]>('/transcription/transcribe', {
    method: 'GET',
    query: { page, page_size: pageSize },
  });
}

/**
 * Attempt to find an existing transcript by its YouTube video id
 * (stored server-side as `resource_id`). First checks user history
 * (if authenticated), then scans public transcripts.
 */
export async function findTranscriptByVideoId(
  videoId: string,
): Promise<TranscriptInfo | null> {
  const token = getStoredToken();

  // 1. Check user history first
  if (token) {
    try {
      const hist = await getTranscriptionHistory();
      // History items hold the transcript_id; we need info for resource_id
      for (const h of hist) {
        try {
          const info = await getTranscriptInfo(h.transcript_id);
          if (info && info.resource_id === videoId) return info;
        } catch {
          /* ignore individual failures */
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Scan first few pages of public transcripts
  const MAX_PAGES = 5;
  const PAGE_SIZE = 50;
  for (let p = 1; p <= MAX_PAGES; p++) {
    try {
      const items = await listPublicTranscripts(p, PAGE_SIZE);
      const found = items.find((t) => t.resource_id === videoId);
      if (found) return found;
      if (items.length < PAGE_SIZE) break;
    } catch {
      break;
    }
  }
  return null;
}

// Batch status check
export async function getBatchTranscriptStatus(
  ids: string[],
): Promise<Record<string, number>> {
  return apiCall<Record<string, number>>('/transcription/transcribe/status', {
    method: 'POST',
    body: ids,
  });
}
