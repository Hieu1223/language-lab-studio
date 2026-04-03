import type { Flashcard, Deck, SRSRating } from './types';
import { mockFlashcards, mockDecks } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let cards = [...mockFlashcards];

export async function getDecks(): Promise<Deck[]> {
  await delay(300);
  return mockDecks.filter(d => d.cardCount > 0);
}

export async function getDeckCards(deckId: string): Promise<Flashcard[]> {
  await delay(200);
  return cards.filter(c => c.deckId === deckId);
}

export async function getDueCards(deckId?: string): Promise<Flashcard[]> {
  await delay(200);
  const now = new Date();
  return cards.filter(c => 
    (!deckId || c.deckId === deckId) && new Date(c.nextReview) <= now
  );
}

export async function reviewCard(cardId: string, rating: SRSRating): Promise<Flashcard> {
  await delay(200);
  const card = cards.find(c => c.id === cardId);
  if (!card) throw new Error('Card not found');

  // Simple SM-2 algorithm
  let { interval, easeFactor, repetitions } = card;
  if (rating === 'again') {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);

    const q = rating === 'easy' ? 5 : rating === 'good' ? 4 : 3;
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }

  const updated: Flashcard = {
    ...card,
    interval,
    easeFactor,
    repetitions,
    nextReview: new Date(Date.now() + interval * 86400000).toISOString(),
    lastReview: new Date().toISOString(),
  };
  cards = cards.map(c => c.id === cardId ? updated : c);
  return updated;
}

export async function addCard(front: string, back: string, partOfSpeech: string): Promise<Flashcard> {
  await delay(200);
  const newCard: Flashcard = {
    id: `card-${Date.now()}`,
    front,
    back,
    partOfSpeech: partOfSpeech as Flashcard['partOfSpeech'],
    deckId: `deck-${partOfSpeech}`,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
  };
  cards.push(newCard);
  return newCard;
}
