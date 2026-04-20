import { apiCall, getStoredToken } from '../api-client';

const API_BASE = 'https://japlearningbackend.onrender.com';

export interface Deck {
  id: string;
  name: string;
  owner_id: string;
  public: boolean;
  cardCount: number;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
}

export interface CardSRData {
  id: string;
  user_id: string;
  card_id: string;
  state: number;
  step: number | null;
  stability: number | null;
  difficulty: number | null;
  due: string;
  last_review: string | null;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

// Fetch all decks for the authenticated user
export async function getDecks(): Promise<Deck[]> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  return apiCall<Deck[]>('/flashcard/decks', {
    token,
  });
}

// Fetch the next card to review for a specific deck
export async function getNextCard(deckId: string): Promise<Card | null> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  return apiCall<Card | null>('/flashcard/cards/next', {
    token,
  });
}

// Submit a card review with a rating
export async function submitReview(
  cardId: string,
  userId: string,
  rating: ReviewRating
): Promise<CardSRData> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  return apiCall<CardSRData>('/flashcard/cards/review', {
    method: 'POST',
    token,
    body: {
      card_id: cardId,
      user_id: userId,
      rating,
    },
  });
}

// Add a new card to a deck
export async function addCard(
  word: string,
  meaning: string,
  deckId: string
): Promise<Card> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');

  return apiCall<Card>('/flashcard/cards', {
    method: 'POST',
    token,
    body: {
      word,
      meaning,
      deck_id: deckId,
    },
  });
}
