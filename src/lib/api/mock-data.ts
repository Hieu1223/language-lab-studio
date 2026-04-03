import type { Flashcard, Deck, PublicTranscript, HistoryEntry, SentencePractice, PricingPlan, UserUsage, TokenInfo, PartOfSpeech } from './types';

// ─── Flashcards & Decks ────────────────────────────────────────────────
const POS_LIST: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'particle', 'classifier', 'interjection'];

const sampleWords: { front: string; back: string; pos: PartOfSpeech }[] = [
  { front: 'nhà', back: 'house', pos: 'noun' },
  { front: 'ăn', back: 'to eat', pos: 'verb' },
  { front: 'đẹp', back: 'beautiful', pos: 'adjective' },
  { front: 'nhanh', back: 'quickly', pos: 'adverb' },
  { front: 'tôi', back: 'I/me', pos: 'pronoun' },
  { front: 'trong', back: 'in/inside', pos: 'preposition' },
  { front: 'và', back: 'and', pos: 'conjunction' },
  { front: 'à', back: '(question particle)', pos: 'particle' },
  { front: 'con', back: '(animal classifier)', pos: 'classifier' },
  { front: 'ôi', back: 'oh!', pos: 'interjection' },
  { front: 'học', back: 'to study', pos: 'verb' },
  { front: 'sách', back: 'book', pos: 'noun' },
  { front: 'lớn', back: 'big', pos: 'adjective' },
  { front: 'chậm', back: 'slowly', pos: 'adverb' },
  { front: 'bạn', back: 'you/friend', pos: 'pronoun' },
  { front: 'trên', back: 'on/above', pos: 'preposition' },
  { front: 'nhưng', back: 'but', pos: 'conjunction' },
  { front: 'cái', back: '(general classifier)', pos: 'classifier' },
  { front: 'đi', back: 'to go', pos: 'verb' },
  { front: 'người', back: 'person', pos: 'noun' },
];

export const mockFlashcards: Flashcard[] = sampleWords.map((w, i) => ({
  id: `card-${i}`,
  front: w.front,
  back: w.back,
  partOfSpeech: w.pos,
  deckId: `deck-${w.pos}`,
  interval: Math.floor(Math.random() * 10) + 1,
  easeFactor: 2.5,
  repetitions: Math.floor(Math.random() * 5),
  nextReview: new Date(Date.now() + Math.random() * 86400000 * 3 - 86400000).toISOString(),
  lastReview: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
}));

export const mockDecks: Deck[] = POS_LIST.map(pos => {
  const cards = mockFlashcards.filter(c => c.partOfSpeech === pos);
  return {
    id: `deck-${pos}`,
    name: pos.charAt(0).toUpperCase() + pos.slice(1) + 's',
    partOfSpeech: pos,
    cardCount: cards.length,
    dueCount: cards.filter(c => new Date(c.nextReview) <= new Date()).length,
  };
});

// ─── Public Transcripts ────────────────────────────────────────────────
export const mockPublicTranscripts: PublicTranscript[] = [
  { id: 'pt-1', title: 'Vietnamese for Beginners - Greetings', videoUrl: 'https://youtube.com/watch?v=abc123', language: 'vi', createdAt: '2026-03-28T10:00:00Z', userId: 'user-1', userName: 'NguyenLearner', viewCount: 342 },
  { id: 'pt-2', title: 'Daily Conversations in Saigon', videoUrl: 'https://youtube.com/watch?v=def456', language: 'vi', createdAt: '2026-03-25T14:00:00Z', userId: 'user-2', userName: 'VietnamExplorer', viewCount: 128 },
  { id: 'pt-3', title: 'Vietnamese Cooking Show - Pho Recipe', videoUrl: 'https://youtube.com/watch?v=ghi789', language: 'vi', createdAt: '2026-03-20T08:00:00Z', userId: 'user-3', userName: 'FoodieVN', viewCount: 567 },
  { id: 'pt-4', title: 'Vietnamese News - Tech Updates', videoUrl: 'https://youtube.com/watch?v=jkl012', language: 'vi', createdAt: '2026-03-15T16:00:00Z', userId: 'user-1', userName: 'NguyenLearner', viewCount: 89 },
  { id: 'pt-5', title: 'Learn Vietnamese Through Songs', videoUrl: 'https://youtube.com/watch?v=mno345', language: 'vi', createdAt: '2026-03-10T12:00:00Z', userId: 'user-4', userName: 'MusicLearner', viewCount: 234 },
];

// ─── History ────────────────────────────────────────────────────────────
export const mockHistory: HistoryEntry[] = [
  { id: 'h-1', videoUrl: 'https://youtube.com/watch?v=abc123', title: 'Vietnamese Greetings', createdAt: '2026-04-02T09:00:00Z', language: 'vi' },
  { id: 'h-2', videoUrl: 'https://youtube.com/watch?v=def456', title: 'Market Conversations', createdAt: '2026-04-01T15:00:00Z', language: 'vi' },
  { id: 'h-3', videoUrl: 'https://youtube.com/watch?v=ghi789', title: 'Pho Recipe Tutorial', createdAt: '2026-03-30T11:00:00Z', language: 'vi' },
];

// ─── Sentence Practice ──────────────────────────────────────────────────
export const mockSentences: SentencePractice[] = [
  { id: 'sp-1', vietnamese: 'Tôi đi học mỗi ngày.', targetSentence: 'I go to school every day.', difficulty: 'beginner', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString() },
  { id: 'sp-2', vietnamese: 'Bạn có muốn ăn phở không?', targetSentence: 'Do you want to eat pho?', difficulty: 'beginner', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString() },
  { id: 'sp-3', vietnamese: 'Hôm nay thời tiết rất đẹp.', targetSentence: 'The weather is very nice today.', difficulty: 'intermediate', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString() },
  { id: 'sp-4', vietnamese: 'Tôi đã sống ở Việt Nam được ba năm.', targetSentence: 'I have lived in Vietnam for three years.', difficulty: 'intermediate', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString() },
  { id: 'sp-5', vietnamese: 'Nếu trời mưa thì chúng ta sẽ ở nhà.', targetSentence: 'If it rains, we will stay at home.', difficulty: 'advanced', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString() },
];

// ─── Pricing ────────────────────────────────────────────────────────────
export const mockPricingPlans: PricingPlan[] = [
  { id: 'free', name: 'Free', price: 0, transcriptionsPerMonth: 3, features: ['3 transcriptions/month', 'Basic flashcards', 'Public transcript access'] },
  { id: 'pro', name: 'Pro', price: 9.99, transcriptionsPerMonth: 50, features: ['50 transcriptions/month', 'Unlimited flashcards', 'Sentence practice', 'Priority processing', 'Export transcripts'] },
  { id: 'unlimited', name: 'Unlimited', price: 19.99, transcriptionsPerMonth: -1, features: ['Unlimited transcriptions', 'All Pro features', 'API access', 'Custom decks', 'Advanced analytics'] },
];

export const mockUserUsage: UserUsage = {
  transcriptionsUsed: 2,
  transcriptionsLimit: 3,
  isPaid: false,
  plan: 'free',
};

// ─── Tokenizer mock ────────────────────────────────────────────────────
export function mockTokenize(text: string): TokenInfo[] {
  const words = text.split(/\s+/).filter(Boolean);
  const posOptions: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'particle'];
  return words.map((w, i) => ({
    token: w,
    partOfSpeech: posOptions[i % posOptions.length],
    meaning: `[meaning of "${w}"]`,
    romanization: w.toLowerCase(),
  }));
}
