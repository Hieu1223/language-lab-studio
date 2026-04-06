import type { GrammarCard, GrammarTopic, GrammarCollection, GrammarListItem, GrammarReviewMode } from './types';
import type { SRSRating, PaginatedResponse, JLPTLevel } from '../common/types';
import { mockGrammarCards, mockGrammarTopics, mockGrammarCollections, allGrammarList } from './mock-data';

export type { GrammarCard, GrammarTopic, GrammarCollection, GrammarListItem, GrammarReviewMode } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let cards = [...mockGrammarCards];
let topics = [...mockGrammarTopics];
let collections = [...mockGrammarCollections];
let grammarList = [...allGrammarList];

// ─── Collections ────────────────────────────────────────────────────────
export async function getGrammarCollections(): Promise<GrammarCollection[]> {
  await delay(200);
  return [...collections];
}

export async function createGrammarCollection(name: string, description: string): Promise<GrammarCollection> {
  await delay(300);
  const col: GrammarCollection = { id: `gcol-${Date.now()}`, name, description, topicCount: 0, totalCards: 0, isDefault: false };
  collections.push(col);
  return col;
}

// ─── Topics ─────────────────────────────────────────────────────────────
export async function getGrammarTopics(collectionId: string): Promise<GrammarTopic[]> {
  await delay(200);
  return topics.filter(t => t.collectionId === collectionId);
}

export async function createGrammarTopic(name: string, collectionId: string, level: JLPTLevel): Promise<GrammarTopic> {
  await delay(300);
  const topic: GrammarTopic = { id: `gtopic-${Date.now()}`, name, collectionId, level, cardCount: 0, dueCount: 0, newCount: 0, learningCount: 0, reviewCount: 0, selected: true, newCardsPerDay: 5, weight: 1 };
  topics.push(topic);
  return topic;
}

export async function toggleGrammarTopicSelection(topicId: string, selected: boolean): Promise<GrammarTopic> {
  await delay(100);
  topics = topics.map(t => t.id === topicId ? { ...t, selected } : t);
  return topics.find(t => t.id === topicId)!;
}

export async function selectAllGrammarTopics(collectionId: string, selected: boolean): Promise<GrammarTopic[]> {
  await delay(100);
  topics = topics.map(t => t.collectionId === collectionId ? { ...t, selected } : t);
  return topics.filter(t => t.collectionId === collectionId);
}

// ─── Cards ──────────────────────────────────────────────────────────────
export async function getDueGrammarCards(topicIds: string[]): Promise<GrammarCard[]> {
  await delay(200);
  const now = new Date();
  return cards.filter(c => topicIds.includes(c.topicId) && new Date(c.nextReview) <= now);
}

export async function reviewGrammarCard(cardId: string, rating: SRSRating): Promise<GrammarCard> {
  await delay(200);
  const card = cards.find(c => c.id === cardId);
  if (!card) throw new Error('Card not found');
  let { interval, easeFactor, repetitions } = card;
  if (rating === 'again') { repetitions = 0; interval = 1; }
  else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
    const q = rating === 'easy' ? 5 : rating === 'good' ? 4 : 3;
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }
  const updated: GrammarCard = { ...card, interval, easeFactor, repetitions, nextReview: new Date(Date.now() + interval * 86400000).toISOString(), lastReview: new Date().toISOString() };
  cards = cards.map(c => c.id === cardId ? updated : c);
  return updated;
}

// ─── Grammar browsing (paginated) ───────────────────────────────────────
export async function browseGrammar(page: number, pageSize: number, search: string, level: JLPTLevel | 'all'): Promise<PaginatedResponse<GrammarListItem>> {
  await delay(300);
  let filtered = [...grammarList];
  if (level !== 'all') filtered = filtered.filter(g => g.level === level);
  if (search) filtered = filtered.filter(g => g.pattern.includes(search) || g.meaning.includes(search));
  const total = filtered.length;
  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function addGrammarToTopic(grammarId: string, topicId: string): Promise<GrammarListItem> {
  await delay(300);
  grammarList = grammarList.map(g => g.id === grammarId ? { ...g, addedToTopic: true, topicId } : g);
  return grammarList.find(g => g.id === grammarId)!;
}

export async function removeGrammarFromTopic(grammarId: string): Promise<GrammarListItem> {
  await delay(200);
  grammarList = grammarList.map(g => g.id === grammarId ? { ...g, addedToTopic: false, topicId: null } : g);
  return grammarList.find(g => g.id === grammarId)!;
}
