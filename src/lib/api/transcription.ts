// Transcription + YouTube endpoints, aligned with the current OpenAPI spec.
//
// Routes used here:
//   POST   /transcription                    → start a job for an app video id
//   GET    /transcription?video_id=…         → jobs for one video
//   GET    /transcription/{transcript_id}    → job status + tokenized segments
//   GET    /transcription/visited            → watch history
//   GET    /youtube/video/{video_id}         → preview (also registers the video)
//   GET/POST /youtube/progress               → playback position
import { apiCall } from './client';
import type { components } from './types.gen';

export type VideoPreview = components['schemas']['VideoPreview'];
export type VideoDetail = VideoPreview;
export type ChannelPreview = components['schemas']['ChannelPreview'];
export type TranscriptionJobResponse = components['schemas']['TranscriptionJobResponse'];
export type TranscriptRequestResponse = TranscriptionJobResponse;
export type TranscriptionListItem = components['schemas']['TranscriptionListItem'];
export type TranscriptionListResponse = components['schemas']['TranscriptionListResponse'];
export type VisitedVideoResponse = components['schemas']['VisitedVideoResponse'];
export type VisitedVideoListResponse = components['schemas']['VisitedVideoListResponse'];
export type VideoProgressResponse = components['schemas']['VideoProgressResponse'];
export type ApiToken = components['schemas']['Token'];

/**
 * The API ships tokens with `start`/`stop`; the UI has always spoken
 * `start`/`end`, so normalize once here instead of at every call site.
 */
export interface SegmentWord extends Omit<ApiToken, 'stop' | 'end'> {
  start: number | null;
  end: number | null;
  /** Legacy alias for `surface`, kept so existing UI code keeps working. */
  token: string;
  /** Character offset end from the API's `end` field. */
  char_end: number;
}

/** A transcript segment is simply one sentence's worth of tokens. */
export interface TranscriptSegment {
  words: SegmentWord[];
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
}

/** Normalized detail shape used across the transcription UIs. */
export interface TranscriptDetailResponse {
  id: string;
  status: number;
  done: boolean;
  msg: string;
  data?: TranscriptResult | null;
  /** Enriched from the job list when available. */
  video_id?: string | null;
  resource_id?: string | null;
  original_source?: string | null;
  name?: string | null;
  thumbnail_url?: string | null;
}

// ─── Transcript status ──────────────────────────────────────────────────────
// `status` is an integer job code; `done` is the authoritative completion flag.

export const TRANSCRIPT_STATUS = {
  QUEUED: 0,
  DOWNLOADING: 1,
  TRANSCRIBING: 2,
  READY: 3,
  ERROR: 4,
} as const;

export type TranscriptStatusCode =
  (typeof TRANSCRIPT_STATUS)[keyof typeof TRANSCRIPT_STATUS];

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

// ─── YouTube preview ────────────────────────────────────────────────────────

/** GET /youtube/video/{video_id} — preview before committing to a job. */
export async function previewVideo(videoId: string): Promise<VideoPreview> {
  return apiCall<VideoPreview>(`/youtube/video/${encodeURIComponent(videoId)}`);
}

/**
 * The new API has no separate "visit" route — fetching the preview is what
 * registers the video and yields its internal `app_video_id`.
 */
export async function visitVideo(videoId: string): Promise<VideoPreview> {
  return previewVideo(videoId);
}

/** Extract a YouTube video id from a URL or a bare id. */
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
    if (/(^|\.)youtube\.com$/.test(url.hostname)) {
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

// ─── Transcription jobs ─────────────────────────────────────────────────────

/** POST /transcription — start a job for an internal (app) video id. */
export async function requestTranscription(
  appVideoId: string,
): Promise<TranscriptionJobResponse> {
  return apiCall<TranscriptionJobResponse>('/transcription', {
    method: 'POST',
    body: { video_id: appVideoId },
  });
}

/** POST /transcription — re-run is the same call for the same video. */
export async function rerunTranscription(
  appVideoId: string,
): Promise<TranscriptionJobResponse> {
  return requestTranscription(appVideoId);
}

/** GET /transcription?video_id=… — jobs attached to one video. */
export async function listTranscriptions(
  appVideoId: string,
  { limit = 100, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<TranscriptionListResponse> {
  return apiCall<TranscriptionListResponse>('/transcription', {
    query: { video_id: appVideoId, limit, offset },
  });
}

function normalizeToken(token: ApiToken): SegmentWord {
  const { stop, end, ...rest } = token;
  return {
    ...rest,
    token: token.surface,
    char_end: end,
    start: token.start ?? null,
    end: stop ?? null,
  };
}

/** GET /transcription/{transcript_id} */
export async function getTranscriptionDetail(
  transcriptId: string,
): Promise<TranscriptDetailResponse> {
  const raw = await apiCall<components['schemas']['TranscriptDetailResponse']>(
    `/transcription/${encodeURIComponent(transcriptId)}`,
  );
  return {
    id: raw.id,
    status: raw.status,
    done: raw.done,
    msg: raw.msg,
    data: raw.data
      ? { segments: (raw.data.segments ?? []).map((tokens) => ({ words: tokens.map(normalizeToken) })) }
      : null,
  };
}

/** Latest job for a video, or `null` when the video has never been transcribed. */
export async function getLatestTranscription(
  appVideoId: string,
): Promise<TranscriptionListItem | null> {
  const list = await listTranscriptions(appVideoId, { limit: 1 });
  return list.items?.[0] ?? null;
}

// ─── History ────────────────────────────────────────────────────────────────

/** GET /transcription/visited — videos the user has opened. */
export async function getVisitedVideos(): Promise<VisitedVideoListResponse> {
  return apiCall<VisitedVideoListResponse>('/transcription/visited');
}

// ─── Watch progress ─────────────────────────────────────────────────────────

/** GET /youtube/progress — may legitimately return null. */
export async function getVideoProgress(
  appVideoId: string,
): Promise<VideoProgressResponse | null> {
  return apiCall<VideoProgressResponse | null>('/youtube/progress', {
    query: { video_id: appVideoId },
  });
}

/** POST /youtube/progress — debounced by callers, never per timeupdate. */
export async function saveVideoProgress(
  appVideoId: string,
  progressSeconds: number,
): Promise<VideoProgressResponse> {
  return apiCall<VideoProgressResponse>('/youtube/progress', {
    method: 'POST',
    body: { video_id: appVideoId, progress: Math.max(0, progressSeconds) },
  });
}

/**
 * Fill in missing (null) word timestamps by linear interpolation so every
 * token has a usable seek target.
 */
export function interpolateTranscript(result: TranscriptResult): TranscriptResult {
  const flat: SegmentWord[] = [];
  for (const segment of result.segments ?? []) {
    for (const word of segment.words ?? []) flat.push(word);
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

    // Interior gap: spread evenly between the previous and next known spans.
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
    segments: (result.segments ?? []).map((segment) => ({
      ...segment,
      words: (segment.words ?? []).map((word) => {
        const span = spans[idx++]!;
        return { ...word, start: span.start, end: span.end };
      }),
    })),
  };
}

/** Start time of a segment, or null when it carries no usable timestamps. */
export function segmentStart(segment: TranscriptSegment): number | null {
  for (const word of segment.words ?? []) {
    if (word.start !== null) return word.start;
  }
  return null;
}

/** End time of a segment, or null when it carries no usable timestamps. */
export function segmentEnd(segment: TranscriptSegment): number | null {
  const words = segment.words ?? [];
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (word.end !== null) return word.end;
    if (word.start !== null) return word.start;
  }
  return null;
}
