export type SourceSite = 'youtube' | 'upload';
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ClozeMode = 'classic' | 'listening' | 'reading';

export interface TokenTimestamp {
  start: number;
  end: number;
  token: string;
}

export interface TranscriptSegment {
  text: string;
  words: TokenTimestamp[];
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
}

export interface TranscriptionResponse {
  id: string;
  videoUrl: string;
  title: string;
  thumbnailUrl: string;
  sourceSite: SourceSite;
  status: TranscriptionStatus;
  transcript: TranscriptResult | null;
  createdAt: string;
  isPublic: boolean;
  userId: string;
  language: string;
}

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

export interface TranscribeRequest {
  videoUrl: string;
  fullTranscript: boolean;
  startTime: number;
  endTime: number;
}

export interface TranscribeResponse {
  transcription: TranscriptionResponse;
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

export interface YouTubeChannel {
  id: string;
  name: string;
  avatarUrl: string;
  subscriberCount: string;
  isSubscribed: boolean;
}

export interface PublicTranscript {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  sourceSite: SourceSite;
  language: string;
  createdAt: string;
  userId: string;
  userName: string;
  viewCount: number;
}

export interface TranscriptionFilter {
  status: TranscriptionStatus | 'all';
  sourceSite: SourceSite | 'all';
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
