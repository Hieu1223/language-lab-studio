// ─── Common types shared across modules ─────────────────────────────────

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface SRSFields {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: string;
  lastReview: string | null;
}

export interface UserUsage {
  creditsRemaining: number;
  creditsUsedTotal: number;
  dailyCredits: number;
  dailyCreditsUsed: number;
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  currency: string;
  popular: boolean;
}

export interface KeepAliveConfig {
  enabled: boolean;
  intervalMs: number;
}

export interface KeepAliveResponse {
  status: string;
  serverTime: string;
}

export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'particle' | 'classifier' | 'interjection';

export interface HistoryEntry {
  id: string;
  type: 'transcription' | 'flashcard' | 'grammar' | 'manga' | 'tokenizer';
  title: string;
  description: string;
  timestamp: string;
  metadata: Record<string, string>;
}

export interface PaginatedRequest {
  page: number;
  pageSize: number;
  search: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
