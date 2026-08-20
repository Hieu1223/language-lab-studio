// Transcription + YouTube endpoints
// Matches: /transcription/*, /youtube/* routes from OpenAPI spec
import { apiCall } from './client';
import type { components } from './types.gen';

// ─── Types ──────────────────────────────────────────────────────────────────

export type VideoPreview = components['schemas']['VideoPreview'];
export type ChannelPreview = components['schemas']['ChannelPreview'];
export type TranscriptResult = components['schemas']['TranscriptResult'];
export type TranscriptSegment = TranscriptResult['segments'][number];
export type TokenTimestamp = components['schemas']['Token'];
export type TranscriptDetailResponse = components['schemas']['TranscriptDetailResponse'];
export type TranscriptionJobResponse = components['schemas']['TranscriptionJobResponse'];
export type TranscriptionListResponse = components['schemas']['TranscriptionListResponse'];
export type TranscriptionListItem = components['schemas']['TranscriptionListItem'];
export type VisitedVideoListResponse = components['schemas']['VisitedVideoListResponse'];
export type VisitedVideoResponse = components['schemas']['VisitedVideoResponse'];
export type VideoProgressResponse = components['schemas']['VideoProgressResponse'];

// ─── Transcript Status ──────────────────────────────────────────────────────

export const TRANSCRIPT_STATUS = {
  QUEUED: 0,
  DOWNLOADING: 1,
  TRANSCRIBING: 2,
  READY: 3,
  ERROR: 4,
} as const;

export type TranscriptStatusCode = (typeof TRANSCRIPT_STATUS)[keyof typeof TRANSCRIPT_STATUS];

export function isTranscriptReady(status: number | null | undefined): boolean {
  return status === TRANSCRIPT_STATUS.READY;
}

export function isTranscriptError(status: number | null | undefined): boolean {
  return status === TRANSCRIPT_STATUS.ERROR;
}

export function describeTranscriptStatus(status: number | null | undefined): string {
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
      return status == null ? 'Chưa phiên dịch' : `Trạng thái ${status}`;
  }
}

// ─── YouTube Preview ────────────────────────────────────────────────────────

/** GET /youtube/video/{video_id} — Preview video metadata */
export async function previewVideo(videoId: string): Promise<VideoPreview> {
  return apiCall<VideoPreview>(`/youtube/video/${encodeURIComponent(videoId)}`);
}

/** Extract YouTube video ID from URL or bare ID */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1);
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (/(\^|\.)youtube\.com$/.test(url.hostname)) {
      const v = url.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const match = url.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/);
      if (match) return match[2];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

// ─── Transcription Jobs ─────────────────────────────────────────────────────

/** POST /transcription — Submit transcription job for a video */
export async function submitTranscriptionJob(videoId: string): Promise<TranscriptionJobResponse> {
  return apiCall<TranscriptionJobResponse>('/transcription', {
    method: 'POST',
    body: { video_id: videoId } as components['schemas']['SubmitTranscriptionRequest'],
  });
}

/** GET /transcription — List transcriptions for a video (browse all attempts) */
export async function listTranscriptions(
  videoId: string,
  limit = 100,
  offset = 0,
): Promise<TranscriptionListResponse> {
  return apiCall<TranscriptionListResponse>('/transcription', {
    query: { video_id: videoId, limit, offset },
  });
}

/** GET /transcription/{transcript_id} — Poll transcription job status */
export async function getTranscriptionDetail(transcriptId: string): Promise<TranscriptDetailResponse> {
  return apiCall<TranscriptDetailResponse>(`/transcription/${encodeURIComponent(transcriptId)}`);
}

// ─── Visited Videos (User History) ──────────────────────────────────────────

/** GET /transcription/visited — Get user's visited videos */
export async function getVisitedVideos(): Promise<VisitedVideoListResponse> {
  return apiCall<VisitedVideoListResponse>('/transcription/visited');
}

// ─── YouTube Progress ───────────────────────────────────────────────────────

/** GET /youtube/progress — Get video playback progress */
export async function getVideoProgress(videoId: string): Promise<VideoProgressResponse | null> {
  return apiCall<VideoProgressResponse | null>('/youtube/progress', {
    query: { video_id: videoId },
  });
}

/** POST /youtube/progress — Save video playback progress */
export async function saveVideoProgress(
  videoId: string,
  progress: number,
): Promise<VideoProgressResponse> {
  return apiCall<VideoProgressResponse>('/youtube/progress', {
    method: 'POST',
    body: { video_id: videoId, progress } as components['schemas']['SaveVideoProgressRequest'],
  });
}

/** POST /transcription/visited — Mark video as visited (creates transcript if needed) */
export async function visitVideo(params: {
  name: string;
  thumbnail_url: string;
  resource_url: string;
  user_id: string;
  resource_id: string;
  original_source: string;
}): Promise<TranscriptDetailResponse> {
  return apiCall<TranscriptDetailResponse>('/transcription/visited', {
    method: 'POST',
    body: params,
  });
}

// ─── Transcript Helpers ─────────────────────────────────────────────────────

/** Interpolate missing timestamps in transcript segments */
export function interpolateTranscript(result: TranscriptResult): TranscriptResult {
  const flat: TokenTimestamp[] = [];
  for (const segment of result.segments ?? []) {
    for (const word of segment) flat.push(word);
  }
  if (flat.length === 0) return result;

  type Span = { start: number; end: number };
  const spans: (Span | null)[] = flat.map((w) =>
    w.start !== null || w.end !== null
      ? { start: w.start ?? (w.end as number), end: w.end ?? (w.start as number) }
      : null,
  );

  const firstKnown = spans.findIndex((s) => s !== null);
  if (firstKnown === -1) return result;
  let lastKnown = spans.length - 1;
  while (lastKnown >= 0 && spans[lastKnown] === null) lastKnown--;

  for (let i = 0; i < spans.length; i++) {
    if (spans[i]) continue;

    if (i < firstKnown) {
      const t = spans[firstKnown]!.start;
      spans[i] = { start: t, end: t };
      continue;
    }
    if (i > lastKnown) {
      const t = spans[lastKnown]!.end;
      spans[i] = { start: t, end: t };
      continue;
    }

    let j = i;
    while (j < spans.length && !spans[j]) j++;
    const prevEnd = spans[i - 1]!.end;
    const nextStart = spans[j]!.start;
    const count = j - i;
    const step = Math.max(0, nextStart - prevEnd) / (count + 1);
    for (let k = 0; k < count; k++) {
      spans[i + k] = { start: prevEnd + step * k, end: prevEnd + step * (k + 1) };
    }
    i = j - 1;
  }

  let idx = 0;
  return {
    ...result,
    segments: result.segments.map((segment) => ({
      ...segment,
      words: segment.map((word) => {
        const span = spans[idx++]!;
        return { ...word, start: span.start, end: span.end };
      }),
    })),
  };
}
