// Transcription + YouTube endpoints (doc §5.3 / §5.4).
import { apiCall } from './client';
import type { components } from './types.gen';

export type VideoPreview = components['schemas']['VideoPreview'];
export type VideoDetail = components['schemas']['VideoDetail'];
export type ChannelPreview = components['schemas']['ChannelPreview'];
export type TranscriptRequestResponse = components['schemas']['TranscriptRequestResponse'];
export type TranscriptDetailResponse = components['schemas']['TranscriptDetailResponse'];
export type TranscriptResult = components['schemas']['TranscriptResult'];
export type TranscriptSegment = components['schemas']['TranscriptSegment'];
export type TokenTimestamp = components['schemas']['TokenTimestamp'];
export type UserHistoryResponse = components['schemas']['UserHistoryResponse'];
export type UserHistoryListResponse = components['schemas']['UserHistoryListResponse'];
export type VideoProgressResponse = components['schemas']['VideoProgressResponse'];
type YoutubeTranscriptRequestForm = components['schemas']['YoutubeTranscriptRequestForm'];
type SaveIndividualSettingsRequest = components['schemas']['SaveIndividualSettingsRequest'];
type SaveVideoProgressRequest = components['schemas']['SaveVideoProgressRequest'];
type RemoveHistoryRequest = components['schemas']['RemoveHistoryRequest'];

/** Word-level timestamp alias used by the review UIs. */
export type SegmentWord = TokenTimestamp;

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

export interface TranscribeRequestInput {
  name: string;
  thumbnail_url: string;
  resource_url: string;
  user_id: string;
  resource_id?: string | null;
  original_source?: string;
  public?: boolean;
}

function toRequestForm(input: TranscribeRequestInput): YoutubeTranscriptRequestForm {
  return {
    name: input.name,
    resource_id: input.resource_id ?? null,
    original_source: input.original_source ?? 'Youtube',
    public: input.public ?? true,
    thumbnail_url: input.thumbnail_url,
    resource_url: input.resource_url,
    user_id: input.user_id,
  };
}

/** POST /transcription/transcribe/youtube — create a transcription job. */
export async function requestTranscription(
  input: TranscribeRequestInput,
): Promise<TranscriptRequestResponse> {
  return apiCall<TranscriptRequestResponse>('/transcription/transcribe/youtube', {
    method: 'POST',
    body: toRequestForm(input),
  });
}

/** POST /transcription/visit — log a watch into history without transcribing. */
export async function visitVideo(
  input: TranscribeRequestInput,
): Promise<TranscriptDetailResponse> {
  return apiCall<TranscriptDetailResponse>('/transcription/visit', {
    method: 'POST',
    body: toRequestForm(input),
  });
}

/** GET /transcription/transcribe/{id}/detail */
export async function getTranscriptionDetail(id: string): Promise<TranscriptDetailResponse> {
  return apiCall<TranscriptDetailResponse>(
    `/transcription/transcribe/${encodeURIComponent(id)}/detail`,
  );
}

/** POST /transcription/transcribe/{id}/rerun */
export async function rerunTranscription(id: string): Promise<TranscriptRequestResponse> {
  return apiCall<TranscriptRequestResponse>(
    `/transcription/transcribe/${encodeURIComponent(id)}/rerun`,
    { method: 'POST' },
  );
}

/** POST /transcription/transcribe/{id}/settings — per-transcription settings blob. */
export async function saveTranscriptionSettings(
  transcriptId: string,
  settings: Record<string, unknown>,
): Promise<unknown> {
  const body: SaveIndividualSettingsRequest = { transcript_id: transcriptId, settings };
  return apiCall(`/transcription/transcribe/${encodeURIComponent(transcriptId)}/settings`, {
    method: 'POST',
    body,
  });
}

// ─── History ────────────────────────────────────────────────────────────────

/** GET /transcription/history — paginated list of visited/transcribed videos. */
export async function getTranscriptionHistory(): Promise<UserHistoryListResponse> {
  return apiCall<UserHistoryListResponse>('/transcription/history');
}

/** DELETE /transcription/history — body carries the history id. */
export async function deleteTranscriptionHistory(historyId: string): Promise<void> {
  const body: RemoveHistoryRequest = { history_id: historyId };
  await apiCall('/transcription/history', { method: 'DELETE', body });
}

// ─── Watch progress ─────────────────────────────────────────────────────────

/** GET /transcription/progress — may legitimately return null. */
export async function getVideoProgress(
  resourceId: string,
  originalSource = 'Youtube',
): Promise<VideoProgressResponse | null> {
  return apiCall<VideoProgressResponse | null>('/transcription/progress', {
    query: { resource_id: resourceId, original_source: originalSource },
  });
}

/** POST /transcription/progress — debounced by callers, never per timeupdate. */
export async function saveVideoProgress(
  resourceId: string,
  currentPage: number,
  originalSource = 'Youtube',
): Promise<VideoProgressResponse> {
  const body: SaveVideoProgressRequest = {
    resource_id: resourceId,
    original_source: originalSource,
    current_page: Math.max(0, Math.round(currentPage)),
  };
  return apiCall<VideoProgressResponse>('/transcription/progress', { method: 'POST', body });
}

// ─── YouTube search ────────────────────────────────────────────────────────
// NOTE: the new API (doc §5.4) exposes no YouTube search endpoint — only
// `GET /youtube/video/{id}` for a known id. `searchYouTube` is retained as a
// no-op so existing UI degrades gracefully instead of calling a removed route.
export async function searchYouTube(_query: string, _limit = 20): Promise<VideoPreview[]> {
  console.warn('searchYouTube is not supported by the current API');
  return [];
}

/**
 * Fill in missing (null) word timestamps by linear interpolation so every
 * token has a usable seek target.
 *
 * Tokens before the first known timestamp collapse to that timestamp, tokens
 * after the last known one collapse to that end, and interior gaps are spread
 * evenly between their neighbours.
 */
export function interpolateTranscript(result: TranscriptResult): TranscriptResult {
  const flat: TokenTimestamp[] = [];
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
