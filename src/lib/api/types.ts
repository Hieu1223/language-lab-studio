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
  sourceLanguage: string;
  targetSentence: string;
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
  targetSentence: string;
  feedback: string;
  grammarNotes: string[];
}

// ─── Payment / Credits ──────────────────────────────────────────────────
export interface UserUsage {
  creditsRemaining: number;
  dailyCredits: number;
  creditsUsedToday: number;
  overageCreditsUsed: number;
  plan: 'free' | 'pro' | 'unlimited';
  lastRefuel: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  dailyCredits: number;
  overage: { pricePerCredit: number; currency: string } | null;
  features: string[];
}
