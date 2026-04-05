import type { Flashcard, Deck, PublicTranscript, HistoryEntry, SentencePractice, CreditPack, UserUsage, TokenInfo, PartOfSpeech, GrammarCard, TranscriptionResponse, GrammarDeck, JLPTLevel } from './types';

// ─── Flashcards & Decks (JP → VN) ──────────────────────────────────────
const POS_LIST: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'particle', 'classifier', 'interjection'];

const sampleWords: { front: string; back: string; reading: string; pos: PartOfSpeech }[] = [
  { front: '家', back: 'nhà', reading: 'いえ', pos: 'noun' },
  { front: '食べる', back: 'ăn', reading: 'たべる', pos: 'verb' },
  { front: '美しい', back: 'đẹp', reading: 'うつくしい', pos: 'adjective' },
  { front: '速く', back: 'nhanh chóng', reading: 'はやく', pos: 'adverb' },
  { front: '私', back: 'tôi', reading: 'わたし', pos: 'pronoun' },
  { front: 'の中', back: 'bên trong', reading: 'のなか', pos: 'preposition' },
  { front: 'と', back: 'và/với', reading: 'と', pos: 'conjunction' },
  { front: 'か', back: '(trợ từ nghi vấn)', reading: 'か', pos: 'particle' },
  { front: '匹', back: '(đếm con vật)', reading: 'ひき', pos: 'classifier' },
  { front: 'おい', back: 'ê! này!', reading: 'おい', pos: 'interjection' },
  { front: '勉強する', back: 'học', reading: 'べんきょうする', pos: 'verb' },
  { front: '本', back: 'sách', reading: 'ほん', pos: 'noun' },
  { front: '大きい', back: 'lớn, to', reading: 'おおきい', pos: 'adjective' },
  { front: 'ゆっくり', back: 'chậm rãi', reading: 'ゆっくり', pos: 'adverb' },
  { front: 'あなた', back: 'bạn', reading: 'あなた', pos: 'pronoun' },
  { front: 'の上', back: 'trên', reading: 'のうえ', pos: 'preposition' },
  { front: 'しかし', back: 'tuy nhiên', reading: 'しかし', pos: 'conjunction' },
  { front: '個', back: '(đếm chung)', reading: 'こ', pos: 'classifier' },
  { front: '行く', back: 'đi', reading: 'いく', pos: 'verb' },
  { front: '人', back: 'người', reading: 'ひと', pos: 'noun' },
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

function getCardStatus(card: { lastReview: string | null; interval: number }) {
  if (!card.lastReview) return 'new';
  if (card.interval <= 7) return 'learning';
  return 'review';
}

export const mockDecks: Deck[] = POS_LIST.map(pos => {
  const posCards = mockFlashcards.filter(c => c.partOfSpeech === pos);
  const now = new Date();
  return {
    id: `deck-${pos}`,
    name: pos.charAt(0).toUpperCase() + pos.slice(1) + 's',
    partOfSpeech: pos,
    cardCount: posCards.length,
    dueCount: posCards.filter(c => new Date(c.nextReview) <= now).length,
    newCount: posCards.filter(c => getCardStatus(c) === 'new').length,
    learningCount: posCards.filter(c => getCardStatus(c) === 'learning').length,
    reviewCount: posCards.filter(c => getCardStatus(c) === 'review').length,
  };
});

// ─── Grammar Cards ─────────────────────────────────────────────────────
export const mockGrammarCards: GrammarCard[] = [
  { id: 'gc-1', pattern: '〜は〜です', meaning: 'A là B (khẳng định)', example: '私は学生です。', exampleTranslation: 'Tôi là học sinh.', level: 'N5', deckId: 'gdeck-N5', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-2', pattern: '〜を〜ます', meaning: 'Làm gì đó (tha động từ)', example: 'りんごを食べます。', exampleTranslation: 'Ăn táo.', level: 'N5', deckId: 'gdeck-N5', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-3', pattern: '〜たい', meaning: 'Muốn làm gì đó', example: '日本に行きたいです。', exampleTranslation: 'Tôi muốn đi Nhật.', level: 'N5', deckId: 'gdeck-N5', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-4', pattern: '〜ている', meaning: 'Đang làm / trạng thái', example: '今、本を読んでいます。', exampleTranslation: 'Bây giờ đang đọc sách.', level: 'N4', deckId: 'gdeck-N4', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-5', pattern: '〜たら', meaning: 'Nếu / Khi', example: '雨が降ったら、家にいます。', exampleTranslation: 'Nếu trời mưa, tôi ở nhà.', level: 'N4', deckId: 'gdeck-N4', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-6', pattern: '〜なければならない', meaning: 'Phải làm gì đó', example: '宿題をしなければなりません。', exampleTranslation: 'Phải làm bài tập.', level: 'N4', deckId: 'gdeck-N4', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-7', pattern: '〜ようにする', meaning: 'Cố gắng làm gì đó', example: '毎日運動するようにしています。', exampleTranslation: 'Tôi cố gắng tập thể dục mỗi ngày.', level: 'N3', deckId: 'gdeck-N3', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-8', pattern: '〜てしまう', meaning: 'Hoàn thành / tiếc nuối', example: 'ケーキを全部食べてしまいました。', exampleTranslation: 'Đã ăn hết bánh rồi.', level: 'N3', deckId: 'gdeck-N3', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
];

const JLPT_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const mockGrammarDecks: GrammarDeck[] = JLPT_LEVELS.map(level => {
  const levelCards = mockGrammarCards.filter(c => c.level === level);
  const now = new Date();
  return {
    id: `gdeck-${level}`,
    name: `JLPT ${level}`,
    level,
    cardCount: levelCards.length,
    dueCount: levelCards.filter(c => new Date(c.nextReview) <= now).length,
    newCount: levelCards.filter(c => !c.lastReview).length,
    learningCount: levelCards.filter(c => c.lastReview && c.interval <= 7).length,
    reviewCount: levelCards.filter(c => c.lastReview && c.interval > 7).length,
  };
});

// ─── Transcriptions with thumbnail/source/status ────────────────────────
const mockSegments = [
  { text: 'みなさん、こんにちは。今日は日本語を勉強しましょう。', words: [
    { start: 0, end: 0.8, token: 'みなさん、' }, { start: 0.8, end: 1.5, token: 'こんにちは。' },
    { start: 1.5, end: 2, token: '今日は' }, { start: 2, end: 2.8, token: '日本語を' },
    { start: 2.8, end: 3.5, token: '勉強' }, { start: 3.5, end: 4, token: 'しましょう。' },
  ]},
  { text: 'この授業はとても面白くて役に立ちます。', words: [
    { start: 4, end: 4.5, token: 'この' }, { start: 4.5, end: 5, token: '授業は' },
    { start: 5, end: 5.5, token: 'とても' }, { start: 5.5, end: 6.2, token: '面白くて' },
    { start: 6.2, end: 6.8, token: '役に' }, { start: 6.8, end: 7.3, token: '立ちます。' },
  ]},
];

export const mockTranscriptions: TranscriptionResponse[] = [
  {
    id: 'tr-1', videoUrl: 'https://youtube.com/watch?v=abc123', title: 'Bài học tiếng Nhật cho người mới bắt đầu',
    thumbnailUrl: 'https://img.youtube.com/vi/abc123/mqdefault.jpg', sourceSite: 'youtube', status: 'completed',
    transcript: { segments: mockSegments }, createdAt: '2026-04-01T10:00:00Z', isPublic: false, userId: 'current-user', language: 'ja',
  },
  {
    id: 'tr-2', videoUrl: 'https://youtube.com/watch?v=def456', title: 'Từ vựng nấu ăn - 料理の単語',
    thumbnailUrl: 'https://img.youtube.com/vi/def456/mqdefault.jpg', sourceSite: 'youtube', status: 'completed',
    transcript: { segments: mockSegments }, createdAt: '2026-03-28T14:00:00Z', isPublic: true, userId: 'current-user', language: 'ja',
  },
  {
    id: 'tr-3', videoUrl: '', title: 'Ghi âm bài giảng tuần 5',
    thumbnailUrl: '', sourceSite: 'upload', status: 'processing',
    transcript: null, createdAt: '2026-04-03T09:00:00Z', isPublic: false, userId: 'current-user', language: 'ja',
  },
  {
    id: 'tr-4', videoUrl: 'https://youtube.com/watch?v=ghi789', title: 'JLPT N3 Listening Practice',
    thumbnailUrl: 'https://img.youtube.com/vi/ghi789/mqdefault.jpg', sourceSite: 'youtube', status: 'pending',
    transcript: null, createdAt: '2026-04-04T08:00:00Z', isPublic: false, userId: 'current-user', language: 'ja',
  },
];

// ─── Public Transcripts ────────────────────────────────────────────────
export const mockPublicTranscripts: PublicTranscript[] = [
  { id: 'pt-1', title: 'Tiếng Nhật cho người mới - あいさつ', videoUrl: 'https://youtube.com/watch?v=abc123', thumbnailUrl: 'https://img.youtube.com/vi/abc123/mqdefault.jpg', sourceSite: 'youtube', language: 'ja', createdAt: '2026-03-28T10:00:00Z', userId: 'user-1', userName: 'TanakaLearner', viewCount: 342 },
  { id: 'pt-2', title: 'Hội thoại hàng ngày ở Tokyo', videoUrl: 'https://youtube.com/watch?v=def456', thumbnailUrl: 'https://img.youtube.com/vi/def456/mqdefault.jpg', sourceSite: 'youtube', language: 'ja', createdAt: '2026-03-25T14:00:00Z', userId: 'user-2', userName: 'JapanExplorer', viewCount: 128 },
  { id: 'pt-3', title: 'Chương trình nấu ăn Nhật - ラーメン', videoUrl: 'https://youtube.com/watch?v=ghi789', thumbnailUrl: 'https://img.youtube.com/vi/ghi789/mqdefault.jpg', sourceSite: 'youtube', language: 'ja', createdAt: '2026-03-20T08:00:00Z', userId: 'user-3', userName: 'FoodieJP', viewCount: 567 },
  { id: 'pt-4', title: 'NHK News - Công nghệ', videoUrl: 'https://youtube.com/watch?v=jkl012', thumbnailUrl: 'https://img.youtube.com/vi/jkl012/mqdefault.jpg', sourceSite: 'youtube', language: 'ja', createdAt: '2026-03-15T16:00:00Z', userId: 'user-1', userName: 'TanakaLearner', viewCount: 89 },
  { id: 'pt-5', title: 'Học tiếng Nhật qua J-Pop', videoUrl: 'https://youtube.com/watch?v=mno345', thumbnailUrl: 'https://img.youtube.com/vi/mno345/mqdefault.jpg', sourceSite: 'youtube', language: 'ja', createdAt: '2026-03-10T12:00:00Z', userId: 'user-4', userName: 'MusicLearner', viewCount: 234 },
];

// ─── History ────────────────────────────────────────────────────────────
export const mockHistory: HistoryEntry[] = [
  { id: 'h-1', videoUrl: 'https://youtube.com/watch?v=abc123', title: 'Chào hỏi tiếng Nhật - あいさつ', createdAt: '2026-04-02T09:00:00Z', language: 'ja' },
  { id: 'h-2', videoUrl: 'https://youtube.com/watch?v=def456', title: 'Hội thoại mua sắm - 買い物', createdAt: '2026-04-01T15:00:00Z', language: 'ja' },
  { id: 'h-3', videoUrl: 'https://youtube.com/watch?v=ghi789', title: 'Hướng dẫn nấu Ramen', createdAt: '2026-03-30T11:00:00Z', language: 'ja' },
];

// ─── Sentence Practice (JP ↔ VN) ────────────────────────────────────────
export const mockSentences: SentencePractice[] = [
  { id: 'sp-1', japanese: '私は毎日学校に行きます。', vietnamese: 'Tôi đi học mỗi ngày.', difficulty: 'beginner', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 1 },
  { id: 'sp-2', japanese: 'ラーメンを食べたいですか？', vietnamese: 'Bạn có muốn ăn ramen không?', difficulty: 'beginner', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 1 },
  { id: 'sp-3', japanese: '今日の天気はとても良いです。', vietnamese: 'Thời tiết hôm nay rất tốt.', difficulty: 'intermediate', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 2 },
  { id: 'sp-4', japanese: '私は日本に三年間住んでいます。', vietnamese: 'Tôi đã sống ở Nhật ba năm.', difficulty: 'intermediate', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 2 },
  { id: 'sp-5', japanese: '雨が降ったら、家にいます。', vietnamese: 'Nếu trời mưa, tôi ở nhà.', difficulty: 'advanced', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), creditCost: 3 },
];

// ─── Credit Packs (on-demand) ───────────────────────────────────────────
export const mockCreditPacks: CreditPack[] = [
  { id: 'pack-10', credits: 10, price: 1.99, currency: '$' },
  { id: 'pack-50', credits: 50, price: 7.99, currency: '$', popular: true },
  { id: 'pack-100', credits: 100, price: 12.99, currency: '$' },
  { id: 'pack-500', credits: 500, price: 49.99, currency: '$' },
  { id: 'pack-1000', credits: 1000, price: 79.99, currency: '$' },
];

export const mockUserUsage: UserUsage = {
  creditsRemaining: 3,
  creditsUsedTotal: 12,
};

// ─── Tokenizer mock ────────────────────────────────────────────────────
export function mockTokenize(text: string): TokenInfo[] {
  const segments = text.match(/[\u4e00-\u9faf]+|[\u3040-\u309f]+|[\u30a0-\u30ff]+|[a-zA-Z]+|[^\s]/g) || [];
  const posOptions: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb', 'particle'];
  return segments.map((w, i) => ({
    token: w,
    partOfSpeech: posOptions[i % posOptions.length],
    meaning: `[nghĩa của "${w}"]`,
    romanization: w,
  }));
}
