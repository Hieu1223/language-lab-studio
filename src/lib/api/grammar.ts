import type { GrammarCard, SRSRating } from './types';
import { mockGrammarCards } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let cards = [...mockGrammarCards];

export async function getDueGrammarCards(): Promise<GrammarCard[]> {
  await delay(300);
  const now = new Date();
  return cards.filter(c => new Date(c.nextReview) <= now);
}

export async function getAllGrammarCards(): Promise<GrammarCard[]> {
  await delay(200);
  return [...cards];
}

export async function reviewGrammarCard(cardId: string, rating: SRSRating): Promise<void> {
  await delay(200);
  cards = cards.map(c => {
    if (c.id !== cardId) return c;
    let { interval, easeFactor, repetitions } = c;
    if (rating === 'again') { repetitions = 0; interval = 1; }
    else {
      repetitions += 1;
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 6;
      else interval = Math.round(interval * easeFactor);
      const q = rating === 'easy' ? 5 : rating === 'good' ? 4 : 3;
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    }
    return { ...c, interval, easeFactor, repetitions, nextReview: new Date(Date.now() + interval * 86400000).toISOString(), lastReview: new Date().toISOString() };
  });
}
