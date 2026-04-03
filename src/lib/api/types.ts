// ─── Transcript types ────────────────────────────────────────────────────
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

export interface TranscriptionResponse {
  id: string;
  videoUrl: string;
  title: string;
  transcript: TranscriptResult;
  createdAt: string;
  isPublic: boolean;
  userId: string;
  language: string;
}

// ─── Flashcard / SRS types ──────────────────────────────────────────────
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'particle' | 'classifier' | 'interjection';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  partOfSpeech: PartOfSpeech;
  deckId: string;
  // SRS fields
  interval: number;      // days
  easeFactor: number;
  repetitions: number;
  nextReview: string;     // ISO date
  lastReview: string | null;
}

export interface Deck {
  id: string;
  name: string;
  partOfSpeech: PartOfSpeech;
  cardCount: number;
  dueCount: number;
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

// ─── Public transcripts ─────────────────────────────────────────────────
export interface PublicTranscript {
  id: string;
  title: string;
  videoUrl: string;
  language: string;
  createdAt: string;
  userId: string;
  userName: string;
  viewCount: number;
}

// ─── History ────────────────────────────────────────────────────────────
export interface HistoryEntry {
  id: string;
  videoUrl: string;
  title: string;
  createdAt: string;
  language: string;
}

// ─── Tokenizer ──────────────────────────────────────────────────────────
export interface TokenInfo {
  token: string;
  partOfSpeech: PartOfSpeech;
  meaning: string;
  romanization?: string;
}

export interface TokenizedResult {
  original: string;
  tokens: TokenInfo[];
}

// ─── Sentence Practice ──────────────────────────────────────────────────
export interface SentencePractice {
  id: string;
  vietnamese: string;
  targetSentence: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  // SRS fields
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: string;
}

export interface PracticeResult {
  isCorrect: boolean;
  userAnswer: string;
  targetSentence: string;
  feedback: string;
  grammarNotes: string[];
}

// ─── Payment / Usage ────────────────────────────────────────────────────
export interface UserUsage {
  transcriptionsUsed: number;
  transcriptionsLimit: number;
  isPaid: boolean;
  plan: 'free' | 'pro' | 'unlimited';
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  transcriptionsPerMonth: number;
  features: string[];
}
