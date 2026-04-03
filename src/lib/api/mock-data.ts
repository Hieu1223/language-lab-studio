import type { Flashcard, Deck, PublicTranscript, HistoryEntry, SentencePractice, PricingPlan, UserUsage, TokenInfo, PartOfSpeech } from './types';

// ─── Flashcards & Decks ────────────────────────────────────────────────
const POS_LIST: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'particle', 'classifier', 'interjection'];

const sampleWords: { front: string; back: string; reading: string; pos: PartOfSpeech }[] = [
  { front: '家', back: 'house', reading: 'いえ', pos: 'noun' },
  { front: '食べる', back: 'to eat', reading: 'たべる', pos: 'verb' },
  { front: '美しい', back: 'beautiful', reading: 'うつくしい', pos: 'adjective' },
  { front: '速く', back: 'quickly', reading: 'はやく', pos: 'adverb' },
  { front: '私', back: 'I/me', reading: 'わたし', pos: 'pronoun' },
  { front: 'の中', back: 'inside', reading: 'のなか', pos: 'preposition' },
  { front: 'と', back: 'and/with', reading: 'と', pos: 'conjunction' },
  { front: 'か', back: '(question particle)', reading: 'か', pos: 'particle' },
  { front: '匹', back: '(animal counter)', reading: 'ひき', pos: 'classifier' },
  { front: 'おい', back: 'hey!', reading: 'おい', pos: 'interjection' },
  { front: '勉強する', back: 'to study', reading: 'べんきょうする', pos: 'verb' },
  { front: '本', back: 'book', reading: 'ほん', pos: 'noun' },
  { front: '大きい', back: 'big', reading: 'おおきい', pos: 'adjective' },
  { front: 'ゆっくり', back: 'slowly', reading: 'ゆっくり', pos: 'adverb' },
  { front: 'あなた', back: 'you', reading: 'あなた', pos: 'pronoun' },
  { front: 'の上', back: 'on/above', reading: 'のうえ', pos: 'preposition' },
  { front: 'しかし', back: 'however', reading: 'しかし', pos: 'conjunction' },
  { front: '個', back: '(general counter)', reading: 'こ', pos: 'classifier' },
  { front: '行く', back: 'to go', reading: 'いく', pos: 'verb' },
  { front: '人', back: 'person', reading: 'ひと', pos: 'noun' },
];

export const mockFlashcards: Flashcard[] = sampleWords.map((w, i) => ({
  id: `card-${i}`,
  front: w.front,
  back: w.back,
  reading: w.reading,
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
  { id: 'pt-1', title: 'Japanese for Beginners - あいさつ', videoUrl: 'https://youtube.com/watch?v=abc123', language: 'ja', createdAt: '2026-03-28T10:00:00Z', userId: 'user-1', userName: 'TanakaLearner', viewCount: 342 },
  { id: 'pt-2', title: 'Daily Conversations in Tokyo', videoUrl: 'https://youtube.com/watch?v=def456', language: 'ja', createdAt: '2026-03-25T14:00:00Z', userId: 'user-2', userName: 'JapanExplorer', viewCount: 128 },
  { id: 'pt-3', title: 'Japanese Cooking Show - ラーメン Recipe', videoUrl: 'https://youtube.com/watch?v=ghi789', language: 'ja', createdAt: '2026-03-20T08:00:00Z', userId: 'user-3', userName: 'FoodieJP', viewCount: 567 },
  { id: 'pt-4', title: 'NHK News - Tech Updates', videoUrl: 'https://youtube.com/watch?v=jkl012', language: 'ja', createdAt: '2026-03-15T16:00:00Z', userId: 'user-1', userName: 'TanakaLearner', viewCount: 89 },
  { id: 'pt-5', title: 'Learn Japanese Through J-Pop', videoUrl: 'https://youtube.com/watch?v=mno345', language: 'ja', createdAt: '2026-03-10T12:00:00Z', userId: 'user-4', userName: 'MusicLearner', viewCount: 234 },
];

// ─── History ────────────────────────────────────────────────────────────
export const mockHistory: HistoryEntry[] = [
  { id: 'h-1', videoUrl: 'https://youtube.com/watch?v=abc123', title: 'Japanese Greetings - あいさつ', createdAt: '2026-04-02T09:00:00Z', language: 'ja' },
  { id: 'h-2', videoUrl: 'https://youtube.com/watch?v=def456', title: 'Market Conversations - 買い物', createdAt: '2026-04-01T15:00:00Z', language: 'ja' },
  { id: 'h-3', videoUrl: 'https://youtube.com/watch?v=ghi789', title: 'Ramen Recipe Tutorial', createdAt: '2026-03-30T11:00:00Z', language: 'ja' },
];

// ─── Sentence Practice ──────────────────────────────────────────────────
export const mockSentences: SentencePractice[] = [
  { id: 'sp-1', sourceLanguage: '私は毎日学校に行きます。', targetSentence: 'I go to school every day.', difficulty: 'beginner', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 1 },
  { id: 'sp-2', sourceLanguage: 'ラーメンを食べたいですか？', targetSentence: 'Do you want to eat ramen?', difficulty: 'beginner', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 1 },
  { id: 'sp-3', sourceLanguage: '今日の天気はとても良いです。', targetSentence: 'The weather is very nice today.', difficulty: 'intermediate', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 2 },
  { id: 'sp-4', sourceLanguage: '私は日本に三年間住んでいます。', targetSentence: 'I have lived in Japan for three years.', difficulty: 'intermediate', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 2 },
  { id: 'sp-5', sourceLanguage: '雨が降ったら、家にいます。', targetSentence: 'If it rains, we will stay at home.', difficulty: 'advanced', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 3 },
];

// ─── Pricing (credit-based, daily refuel) ───────────────────────────────
export const mockPricingPlans: PricingPlan[] = [
  { id: 'free', name: 'Free', price: 0, dailyCredits: 5, overage: null, features: ['5 credits/day (refueled daily)', 'Basic flashcards', 'Public transcript access', '1 credit = 1 transcription or practice'] },
  { id: 'pro', name: 'Pro', price: 9.99, dailyCredits: 25, overage: { pricePerCredit: 0.10, currency: '$' }, features: ['25 credits/day', 'Overage at $0.10/credit', 'Unlimited flashcards', 'Priority processing', 'Export transcripts'] },
  { id: 'unlimited', name: 'Unlimited', price: 29.99, dailyCredits: 100, overage: { pricePerCredit: 0.05, currency: '$' }, features: ['100 credits/day', 'Overage at $0.05/credit', 'All Pro features', 'API access', 'Advanced analytics'] },
];

export const mockUserUsage: UserUsage = {
  creditsRemaining: 3,
  dailyCredits: 5,
  creditsUsedToday: 2,
  overageCreditsUsed: 0,
  plan: 'free',
  lastRefuel: new Date().toISOString(),
};

// ─── Tokenizer mock ────────────────────────────────────────────────────
export function mockTokenize(text: string): TokenInfo[] {
  // Simple mock: split by character groups (rough approximation)
  const segments = text.match(/[\u4e00-\u9faf]+|[\u3040-\u309f]+|[\u30a0-\u30ff]+|[a-zA-Z]+|[^\s]/g) || [];
  const posOptions: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'particle'];
  return segments.map((w, i) => ({
    token: w,
    partOfSpeech: posOptions[i % posOptions.length],
    meaning: `[meaning of "${w}"]`,
    romanization: w,
  }));
}
