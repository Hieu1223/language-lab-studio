// ─── Transcription types aligned with backend Pydantic models ────────────

export type SupportedSite = 'Youtube' | 'FileUpload';

export enum TranscriptStatus {
  Uploading = 0,
  InQueue = 1,
  Transcripting = 2,
  Finish = 3,
}

export interface Transcript {
  id: string;
  original_source: SupportedSite;
  resource_id: string | null;
  resource_url: string;
  thumnail_url: string;
  name: string;
  date_created: string;
  data: string | null;
  status: number;
  public: boolean;
}

export interface TranscriptionHistory {
  id: string;
  transcript_id: string;
  job_status: 'queued' | 'processing' | 'done' | 'failed';
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
}

// ── Request / Response schemas ────────────────────────────────────────────

export interface YoutubeIDTranscriptRequestForm {
  resource_id: string;
}

export interface YoutubeTranscriptRequestForm {
  name: string;
  resource_id: string;
  original_source: SupportedSite;
  public: boolean;
  thumbnail_url: string;
  resource_url: string;
}

export interface TranscriptRequestResponse {
  transcript_id: string;
  success: boolean;
}

export interface TranscriptStatusRequest {
  transcript_id: string;
}

export interface TranscriptStatusResponse {
  done: boolean;
  msg: string;
}

export interface TranscriptInfoRequest {
  transcript_id: string;
}

export interface TranscriptInfoResponse {
  id: string;
  original_source: SupportedSite;
  thumnail_url: string;
  resource_url: string;
  resource_id: string | null;
  status: number;
}

export interface TokenTimestamp {
  start: number | null;
  end: number | null;
  token: string;
}

export interface TranscriptSegment {
  text: string;
  words: TokenTimestamp[];
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
}

export interface ErrorMessage {
  msg: string;
}

// ── App-level types (UI helpers) ──────────────────────────────────────────

export type ClozeMode = 'classic';

export interface ClozeSettings {
  mode: ClozeMode;
  minWordsInCloze: number;
  maxWordsInCloze: number;
  minGapBetweenCloze: number;
  maxGapBetweenCloze: number;
  windowSize: number;
  windowOffset: number;
}

export interface VideoPlayerSettings {
  playbackRate: number;
  seekDuration: number;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channelName: string;
  channelId: string;
  thumbnailUrl: string;
  viewCount: string;
  publishedAt: string;
  duration: string;
  isTranscribed: boolean;
}

export interface TranscriptionFilter {
  status: 'all' | number;
  sourceSite: SupportedSite | 'all';
  search: string;
}

export interface TokenInfo {
  token: string;
  partOfSpeech: string;
  meaning: string;
  romanization: string;
}

export interface TokenizedResult {
  original: string;
  tokens: TokenInfo[];
}
