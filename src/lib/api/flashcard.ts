// Flashcard endpoints (doc §5.8).
//
// The API surface is deliberately small — everything here maps 1:1 to a real
// endpoint in the OpenAPI spec. In particular there is NO dictionary search
// under /flashcard; use `lookupWord` from ./dictionary instead. And only vocab
// cards can be created (`POST /flashcard/decks/{id}/cards/vocab`).
import { apiCall } from './client';
import type { components } from './types.gen';

export type DeckResponse = components['schemas']['DeckResponse'];
export type DeckStatsResponse = components['schemas']['DeckStatsResponse'];
export type DeckWithStatsResponse = components['schemas']['DeckWithStatsResponse'];
export type DeckProgressResponse = components['schemas']['DeckProgressResponse'];
export type PublicDeckResponse = components['schemas']['PublicDeckResponse'];
export type CardResponse = components['schemas']['CardResponse'];
export type CardWithSrsResponse = components['schemas']['CardWithSrsResponse'];
export type ReviewSessionWithSrsResponse = components['schemas']['ReviewSessionWithSrsResponse'];
export type CardType = components['schemas']['CardType'];
export type CardState = components['schemas']['CardState'];
type AddVocabRequest = components['schemas']['AddVocabRequest'];
type SaveReviewRequest = components['schemas']['SaveReviewRequest'];

// ─── Decks ──────────────────────────────────────────────────────────────────

/** GET /flashcard/decks */
export async function getDecks(): Promise<DeckWithStatsResponse[]> {
  return apiCall<DeckWithStatsResponse[]>('/flashcard/decks');
}

/** POST /flashcard/decks — `name`/`public` are query parameters. */
export async function createDeck(name: string, isPublic = false): Promise<DeckWithStatsResponse> {
  return apiCall<DeckWithStatsResponse>('/flashcard/decks', {
    method: 'POST',
    query: { name, public: isPublic },
  });
}

/** PATCH /flashcard/decks/{deck_id} — rename; `name` is a query parameter. */
export async function renameDeck(deckId: string, name: string): Promise<DeckResponse> {
  return apiCall<DeckResponse>(`/flashcard/decks/${encodeURIComponent(deckId)}`, {
    method: 'PATCH',
    query: { name },
  });
}

/** DELETE /flashcard/decks/{deck_id} */
export async function deleteDeck(deckId: string): Promise<void> {
  await apiCall(`/flashcard/decks/${encodeURIComponent(deckId)}`, { method: 'DELETE' });
}

/** GET /flashcard/decks/{deck_id}/progress */
export async function getDeckProgress(deckId: string): Promise<DeckProgressResponse> {
  return apiCall<DeckProgressResponse>(
    `/flashcard/decks/${encodeURIComponent(deckId)}/progress`,
  );
}

// ─── Public decks ───────────────────────────────────────────────────────────

/** GET /flashcard/decks/public */
export async function getPublicDecks(): Promise<PublicDeckResponse[]> {
  return apiCall<PublicDeckResponse[]>('/flashcard/decks/public');
}

/** POST /flashcard/decks/{deck_id}/copy — clones cards + SRS into a private deck. */
export async function copyPublicDeck(deckId: string): Promise<DeckWithStatsResponse> {
  return apiCall<DeckWithStatsResponse>(
    `/flashcard/decks/${encodeURIComponent(deckId)}/copy`,
    { method: 'POST' },
  );
}

// ─── Cards ──────────────────────────────────────────────────────────────────

/** GET /flashcard/decks/{deck_id}/cards — simplified shape (enum `state`). */
export async function getDeckCards(deckId: string): Promise<CardResponse[]> {
  return apiCall<CardResponse[]>(`/flashcard/decks/${encodeURIComponent(deckId)}/cards`);
}

/** POST /flashcard/decks/{deck_id}/cards/vocab — the only card-create endpoint. */
export async function addVocabCard(
  deckId: string,
  word: string,
  meaning: string,
): Promise<CardResponse> {
  const body: AddVocabRequest = { word, meaning };
  return apiCall<CardResponse>(
    `/flashcard/decks/${encodeURIComponent(deckId)}/cards/vocab`,
    { method: 'POST', body },
  );
}

/** DELETE /flashcard/decks/{deck_id}/cards/{card_id} */
export async function deleteCard(deckId: string, cardId: string): Promise<void> {
  await apiCall(
    `/flashcard/decks/${encodeURIComponent(deckId)}/cards/${encodeURIComponent(cardId)}`,
    { method: 'DELETE' },
  );
}

/** POST /flashcard/decks/{deck_id}/cards/{card_id}/reset — wipe SRS state. */
export async function resetCard(deckId: string, cardId: string): Promise<CardResponse> {
  return apiCall<CardResponse>(
    `/flashcard/decks/${encodeURIComponent(deckId)}/cards/${encodeURIComponent(cardId)}/reset`,
    { method: 'POST' },
  );
}

// ─── Review session ─────────────────────────────────────────────────────────

/** GET /flashcard/decks/{deck_id}/review-session — raw `srs_*` primitives. */
export async function loadReviewSession(
  deckId: string,
  limit = 20,
): Promise<ReviewSessionWithSrsResponse> {
  return apiCall<ReviewSessionWithSrsResponse>(
    `/flashcard/decks/${encodeURIComponent(deckId)}/review-session`,
    { query: { limit } },
  );
}

/**
 * POST /flashcard/cards/{card_id}/review — persists the whole ts-fsrs Card.
 * Called immediately per grade, never batched (doc §5.8).
 */
export async function saveCardReview(
  cardId: string,
  card: Record<string, unknown>,
): Promise<CardResponse> {
  const body: SaveReviewRequest = { card };
  return apiCall<CardResponse>(`/flashcard/cards/${encodeURIComponent(cardId)}/review`, {
    method: 'POST',
    body,
  });
}

// ─── Card content helpers ───────────────────────────────────────────────────

/** Parsed contents of a vocab card's `data` blob. */
export interface VocabCardData {
  word: string;
  reading?: string;
  meaning?: string;
}

/**
 * `data` is a JSON string whose shape depends on `card_type`. Parsing is
 * defensive: a malformed blob renders as an empty card rather than crashing
 * the review session.
 */
export function parseCardData<T = Record<string, unknown>>(data: string): T | null {
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

/** Best-effort display text for any card type, used in lists and fallbacks. */
export function cardTitle(card: Pick<CardResponse, 'data'>): string {
  const parsed = parseCardData<Record<string, unknown>>(card.data);
  if (!parsed) return '';
  for (const key of ['word', 'front', 'sentence', 'grammar', 'text']) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}
