import type { Flashcard, FlashcardTopic, FlashcardCollection, FlashcardPreset, FlashcardFieldConfig, AddFlashcardResponse, LookupWordResponse } from './types';
import type { SRSRating, PartOfSpeech } from '../common/types';
import { mockFlashcards, mockTopics, mockCollections, mockPresets, defaultFieldConfig } from './mock-data';

export type { Flashcard, FlashcardTopic, FlashcardCollection, FlashcardPreset, FlashcardFieldConfig, AddFlashcardResponse, LookupWordResponse } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let cards = [...mockFlashcards];
let topics = [...mockTopics];
let collections = [...mockCollections];
let presets = [...mockPresets];

// ─── Collections ────────────────────────────────────────────────────────
export async function getCollections(userId: string): Promise<FlashcardCollection[]> {
  await delay(200);
  return [...collections];
}

export async function createCollection(userId: string, name: string, description: string): Promise<FlashcardCollection> {
  await delay(300);
  const col: FlashcardCollection = { id: `col-${Date.now()}`, name, description, topicCount: 0, totalCards: 0, isDefault: false };
  collections.push(col);
  return col;
}

// ─── Topics ─────────────────────────────────────────────────────────────
export async function getTopics(userId: string, collectionId: string): Promise<FlashcardTopic[]> {
  await delay(200);
  return topics.filter(t => t.collectionId === collectionId);
}

export async function getAllTopics(userId: string): Promise<FlashcardTopic[]> {
  await delay(200);
  return [...topics];
}

export async function createTopic(userId: string, name: string, collectionId: string): Promise<FlashcardTopic> {
  await delay(300);
  const topic: FlashcardTopic = { id: `topic-${Date.now()}`, name, collectionId, cardCount: 0, dueCount: 0, newCount: 0, learningCount: 0, reviewCount: 0, selected: true, newCardsPerDay: 10, weight: 1 };
  topics.push(topic);
  return topic;
}

export async function toggleTopicSelection(userId: string, topicId: string, selected: boolean): Promise<FlashcardTopic> {
  await delay(100);
  topics = topics.map(t => t.id === topicId ? { ...t, selected } : t);
  return topics.find(t => t.id === topicId)!;
}

export async function selectAllTopics(userId: string, collectionId: string, selected: boolean): Promise<FlashcardTopic[]> {
  await delay(100);
  topics = topics.map(t => t.collectionId === collectionId ? { ...t, selected } : t);
  return topics.filter(t => t.collectionId === collectionId);
}

export async function updateTopicWeight(userId: string, topicId: string, weight: number): Promise<FlashcardTopic> {
  await delay(100);
  topics = topics.map(t => t.id === topicId ? { ...t, weight } : t);
  return topics.find(t => t.id === topicId)!;
}

export async function updateTopicNewCards(userId: string, topicId: string, count: number): Promise<FlashcardTopic> {
  await delay(100);
  topics = topics.map(t => t.id === topicId ? { ...t, newCardsPerDay: count } : t);
  return topics.find(t => t.id === topicId)!;
}

// ─── Cards ──────────────────────────────────────────────────────────────
export async function getDueCards(userId: string, topicIds: string[]): Promise<Flashcard[]> {
  await delay(200);
  const now = new Date();
  return cards.filter(c => topicIds.includes(c.topicId) && new Date(c.nextReview) <= now);
}

export async function reviewCard(userId: string, cardId: string, rating: SRSRating): Promise<Flashcard> {
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
  const updated: Flashcard = { ...card, interval, easeFactor, repetitions, nextReview: new Date(Date.now() + interval * 86400000).toISOString(), lastReview: new Date().toISOString() };
  cards = cards.map(c => c.id === cardId ? updated : c);
  return updated;
}

export async function addCard(userId: string, front: string, topicId: string, collectionId: string): Promise<AddFlashcardResponse> {
  await delay(500);
  const mockPos: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'particle'];
  const detectedPos = mockPos[Math.floor(Math.random() * mockPos.length)];
  const newCard: Flashcard = {
    id: `card-${Date.now()}`,
    front,
    back: `[nghĩa tự tạo bởi backend cho "${front}"]`,
    reading: front,
    partOfSpeech: detectedPos,
    topicId,
    collectionId,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
  };
  cards.push(newCard);
  return { card: newCard };
}

// ─── Lookup ─────────────────────────────────────────────────────────────
export async function lookupWord(userId: string, word: string): Promise<LookupWordResponse> {
  await delay(400);
  const existing = cards.find(c => c.front === word);
  return {
    word,
    reading: word,
    meaning: `[nghĩa của "${word}"]`,
    partOfSpeech: 'noun',
    examples: [`${word}を使います。`, `これは${word}です。`],
    existsInFlashcards: !!existing,
    flashcardId: existing ? existing.id : null,
  };
}

// ─── Presets ─────────────────────────────────────────────────────────────
export async function getPresets(userId: string): Promise<FlashcardPreset[]> {
  await delay(200);
  return [...presets];
}

export async function savePreset(userId: string, preset: FlashcardPreset): Promise<FlashcardPreset> {
  await delay(300);
  const idx = presets.findIndex(p => p.id === preset.id);
  if (idx >= 0) presets[idx] = preset;
  else presets.push(preset);
  return preset;
}

export async function getFieldConfig(userId: string): Promise<FlashcardFieldConfig[]> {
  await delay(100);
  return [...defaultFieldConfig];
}

export async function saveFieldConfig(userId: string, config: FlashcardFieldConfig[]): Promise<FlashcardFieldConfig[]> {
  await delay(200);
  return config;
}
