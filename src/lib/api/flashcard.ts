// Flashcard endpoints
// Matches: /flashcard/* routes from OpenAPI spec
import { apiCall } from './client';
import type { components } from './types.gen';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DeckResponse = components['schemas']['DeckResponse'];
export type DeckWithStatsResponse = components['schemas']['DeckWithStatsResponse'];
export type DeckProgressResponse = components['schemas']['DeckProgressResponse'];
export type CardResponse = components['schemas']['CardResponse'];
export type CardWithSrsResponse = components['schemas']['CardWithSrsResponse'];
export type PublicDeckResponse = components['schemas']['PublicDeckResponse'];
export type ReviewSessionWithSrsResponse = components['schemas']['ReviewSessionWithSrsResponse'];
export type CreateDeckRequest = components['schemas']['CreateDeckRequest'];
export type AddVocabRequest = components['schemas']['AddVocabRequest'];
export type SaveReviewRequest = components['schemas']['SaveReviewRequest'];

// ─── Decks ──────────────────────────────────────────────────────────────────

/** GET /flashcard/decks/public — Browse public decks */
export async function browsePublicDecks(): Promise<PublicDeckResponse[]> {
  return apiCall<PublicDeckResponse[]>('/flashcard/decks/public');
}

/** Legacy alias for backward compatibility */
export async function getPublicDecks(): Promise<PublicDeckResponse[]> {
  return browsePublicDecks();
}

/** POST /flashcard/decks/{deck_id}/copy — Copy public deck to user's collection */
export async function copyPublicDeck(deckId: string): Promise<DeckWithStatsResponse> {
  return apiCall<DeckWithStatsResponse>(`/flashcard/decks/${encodeURIComponent(deckId)}/copy`, {
    method: 'POST',
  });
}

/** GET /flashcard/decks — List user's decks with SRS stats */
export async function readDecks(): Promise<DeckWithStatsResponse[]> {
  return apiCall<DeckWithStatsResponse[]>('/flashcard/decks');
}

/** Legacy alias for backward compatibility */
export async function getDecks(): Promise<DeckWithStatsResponse[]> {
  return readDecks();
}

/** POST /flashcard/decks — Create new deck */
export async function createDeck(name: string, isPublic = false): Promise<DeckWithStatsResponse> {
  return apiCall<DeckWithStatsResponse>('/flashcard/decks', {
    method: 'POST',
    body: { name, public: isPublic } as CreateDeckRequest,
  });
}

/** PATCH /flashcard/decks/{deck_id} — Rename deck (owner only) */
export async function updateDeck(deckId: string, name: string): Promise<DeckResponse> {
  return apiCall<DeckResponse>(`/flashcard/decks/${encodeURIComponent(deckId)}`, {
    method: 'PATCH',
    query: { name },
  });
}

/** DELETE /flashcard/decks/{deck_id} — Delete deck (owner only) */
export async function deleteDeck(deckId: string): Promise<void> {
  await apiCall(`/flashcard/decks/${encodeURIComponent(deckId)}`, { method: 'DELETE' });
}

/** GET /flashcard/decks/{deck_id}/progress — Get deck SRS progress */
export async function getDeckProgress(deckId: string): Promise<DeckProgressResponse> {
  return apiCall<DeckProgressResponse>(`/flashcard/decks/${encodeURIComponent(deckId)}/progress`);
}

// ─── Cards ──────────────────────────────────────────────────────────────────

/** GET /flashcard/decks/{deck_id}/cards — List cards in deck with SRS state */
export async function getCardsInDeck(deckId: string): Promise<CardResponse[]> {
  return apiCall<CardResponse[]>(`/flashcard/decks/${encodeURIComponent(deckId)}/cards`);
}

/** POST /flashcard/decks/{deck_id}/cards/vocab — Add vocab card to deck */
export async function addVocab(deckId: string, word: string, meaning: string): Promise<CardResponse> {
  return apiCall<CardResponse>(`/flashcard/decks/${encodeURIComponent(deckId)}/cards/vocab`, {
    method: 'POST',
    body: { word, meaning } as AddVocabRequest,
  });
}

/** Legacy alias for backward compatibility */
export async function addVocabCard(deckId: string, word: string, meaning: string): Promise<CardResponse> {
  return addVocab(deckId, word, meaning);
}

/** DELETE /flashcard/decks/{deck_id}/cards/{card_id} — Delete card */
export async function deleteCard(deckId: string, cardId: string): Promise<void> {
  await apiCall(`/flashcard/decks/${encodeURIComponent(deckId)}/cards/${encodeURIComponent(cardId)}`, {
    method: 'DELETE',
  });
}

/** POST /flashcard/decks/{deck_id}/cards/{card_id}/reset — Reset card SRS data */
export async function resetCard(deckId: string, cardId: string): Promise<void> {
  await apiCall(`/flashcard/decks/${encodeURIComponent(deckId)}/cards/${encodeURIComponent(cardId)}/reset`, {
    method: 'POST',
  });
}

// ─── Reviews ────────────────────────────────────────────────────────────────

/** GET /flashcard/decks/{deck_id}/review-session — Load due cards for review */
export async function loadReviewSession(
  deckId: string,
  limit = 20,
): Promise<ReviewSessionWithSrsResponse> {
  return apiCall<ReviewSessionWithSrsResponse>(
    `/flashcard/decks/${encodeURIComponent(deckId)}/review-session`,
    { query: { limit } },
  );
}

/** POST /flashcard/cards/{card_id}/review — Submit card review result */
export async function reviewCard(cardId: string, card: Record<string, unknown>): Promise<CardResponse> {
  return apiCall<CardResponse>(`/flashcard/cards/${encodeURIComponent(cardId)}/review`, {
    method: 'POST',
    body: { card } as SaveReviewRequest,
  });
}
