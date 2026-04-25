import { apiCall, getStoredToken } from '../api-client';
import type { WordEntry } from './tokenization';

// ─── Types ─────────────────────────────────────────────────────────────────

/** Server WordResponse (same shape as WordEntry in tokenization) */
export type WordResponse = WordEntry;

export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface DeckStats {
  new: number;
  learning: number;
  review: number;
  relearning: number;
  due: number;
}

export interface DeckWithStats {
  id: string; // uuid
  name: string;
  owner_id: string;
  public: boolean;
  stats: DeckStats;
}

export interface Deck {
  id: string;
  name: string;
  owner_id: string;
  public: boolean;
}

export interface PublicDeck {
  id: string;
  name: string;
  owner_id: string;
  card_count: number;
}

export interface DeckProgress {
  total: number;
  new: number;
  learning: number;
  review: number;
  relearning: number;
  due: number;
}

export interface CardResponse {
  id: string;
  deck_id: string;
  word: WordResponse;
  state: CardState;
  step: number | null;
  stability: number | null;
  difficulty: number | null;
  due: string;
  last_review: string | null;
}

export interface DailyStat {
  date: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

export interface OverviewStats {
  total_decks: number;
  total_cards: number;
  due_cards: number;
  new_cards: number;
  reviews_today: number;
  accuracy: number;
  streak_days: number;
}

// ─── Words search ──────────────────────────────────────────────────────────

export async function searchWords(q: string, limit: number = 20): Promise<WordResponse[]> {
  return apiCall<WordResponse[]>('/flashcard/words/search', {
    method: 'GET',
    query: { q, limit },
  });
}

// ─── Decks ────────────────────────────────────────────────────────────────

function requireToken(): string {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function getDecks(): Promise<DeckWithStats[]> {
  return apiCall<DeckWithStats[]>('/flashcard/decks', {
    method: 'GET',
    token: requireToken(),
  });
}

export async function createDeck(name: string, isPublic: boolean = false): Promise<DeckWithStats> {
  return apiCall<DeckWithStats>('/flashcard/decks', {
    method: 'POST',
    token: requireToken(),
    query: { name, public: isPublic },
  });
}

export async function updateDeck(deckId: string, name: string): Promise<Deck> {
  return apiCall<Deck>(`/flashcard/decks/${deckId}`, {
    method: 'PATCH',
    token: requireToken(),
    query: { name },
  });
}

export async function deleteDeck(deckId: string): Promise<void> {
  await apiCall(`/flashcard/decks/${deckId}`, {
    method: 'DELETE',
    token: requireToken(),
  });
}

export async function getPublicDecks(): Promise<PublicDeck[]> {
  return apiCall<PublicDeck[]>('/flashcard/decks/public', { method: 'GET' });
}

export async function copyPublicDeck(deckId: string): Promise<DeckWithStats> {
  return apiCall<DeckWithStats>(`/flashcard/decks/${deckId}/copy`, {
    method: 'POST',
    token: requireToken(),
  });
}

export async function getDeckProgress(deckId: string): Promise<DeckProgress> {
  return apiCall<DeckProgress>(`/flashcard/decks/${deckId}/progress`, { method: 'GET' });
}

export async function getDeckCards(deckId: string): Promise<CardResponse[]> {
  return apiCall<CardResponse[]>(`/flashcard/decks/${deckId}/cards`, { method: 'GET' });
}

// ─── Cards ────────────────────────────────────────────────────────────────

/** Add a word (by uuid4 word_id from WordEntry/WordResponse) to a deck. */
export async function addCard(deckId: string, wordId: string): Promise<CardResponse> {
  return apiCall<CardResponse>('/flashcard/cards', {
    method: 'POST',
    token: requireToken(),
    body: { deck_id: deckId, word_id: wordId },
  });
}

export async function deleteCard(cardId: string): Promise<void> {
  await apiCall(`/flashcard/cards/${cardId}`, {
    method: 'DELETE',
    token: requireToken(),
  });
}

export async function resetCard(cardId: string): Promise<void> {
  await apiCall(`/flashcard/cards/${cardId}/reset`, {
    method: 'POST',
    token: requireToken(),
  });
}

export async function getNextCard(deckId: string): Promise<CardResponse | null> {
  return apiCall<CardResponse | null>(`/flashcard/decks/${deckId}/next`, { method: 'GET' });
}

export async function reviewCard(
  cardId: string,
  rating: ReviewRating,
): Promise<CardResponse> {
  return apiCall<CardResponse>('/flashcard/cards/review', {
    method: 'POST',
    token: requireToken(),
    body: { card_id: cardId, rating },
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────

export async function getDailyStats(days: number = 30): Promise<DailyStat[]> {
  return apiCall<DailyStat[]>('/flashcard/stats/daily', {
    method: 'GET',
    token: requireToken(),
    query: { days },
  });
}

export async function getOverviewStats(): Promise<OverviewStats> {
  return apiCall<OverviewStats>('/flashcard/stats/overview', {
    method: 'GET',
    token: requireToken(),
  });
}
