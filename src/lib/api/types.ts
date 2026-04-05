// ─── API types ─────────────────────────────────────────────────────────

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

export type SourceSite = 'youtube' | 'upload';
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

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

// ─── Flashcard / SRS types ──────────────────────────────────────────────
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'preposition' | 'conjunction' | 'particle' | 'classifier' | 'interjection';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  reading?: string;
  partOfSpeech: PartOfSpeech;
  deckId: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: string;
  lastReview: string | null;
}

export interface Deck {
  id: string;
  name: string;
  partOfSpeech: PartOfSpeech;
  cardCount: number;
  dueCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

// ─── Grammar Flashcard ─────────────────────────────────────────────────
export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface GrammarCard {
  id: string;
  pattern: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: JLPTLevel;
  deckId: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: string;
  lastReview: string | null;
}

export interface GrammarDeck {
  id: string;
  name: string;
  level: JLPTLevel;
  cardCount: number;
  dueCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
}

// ─── Public transcripts ─────────────────────────────────────────────────
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
export type PracticeMode = 'jp-to-vn' | 'vn-to-jp';

export interface SentencePractice {
  id: string;
  japanese: string;
  vietnamese: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: string;
  creditCost: number;
}

export interface PracticeResult {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  feedback: string;
  grammarNotes: string[];
}

// ─── Payment / Credits ──────────────────────────────────────────────────
export interface UserUsage {
  creditsRemaining: number;
  creditsUsedTotal: number;
}

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  currency: string;
  popular?: boolean;
}

// ─── Auth ───────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}
