import type { Flashcard, FlashcardTopic, FlashcardCollection, FlashcardPreset, FlashcardFieldConfig } from './types';
import type { PartOfSpeech } from '../common/types';

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
  topicId: `topic-${w.pos}`,
  collectionId: 'col-default',
  interval: Math.floor(Math.random() * 10) + 1,
  easeFactor: 2.5,
  repetitions: Math.floor(Math.random() * 5),
  nextReview: new Date(Date.now() + Math.random() * 86400000 * 3 - 86400000).toISOString(),
  lastReview: i % 3 === 0 ? null : new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
}));

function getCardStatus(card: { lastReview: string | null; interval: number }) {
  if (!card.lastReview) return 'new';
  if (card.interval <= 7) return 'learning';
  return 'review';
}

export const mockTopics: FlashcardTopic[] = POS_LIST.map(pos => {
  const posCards = mockFlashcards.filter(c => c.partOfSpeech === pos);
  const now = new Date();
  return {
    id: `topic-${pos}`,
    name: pos.charAt(0).toUpperCase() + pos.slice(1) + 's',
    collectionId: 'col-default',
    cardCount: posCards.length,
    dueCount: posCards.filter(c => new Date(c.nextReview) <= now).length,
    newCount: posCards.filter(c => getCardStatus(c) === 'new').length,
    learningCount: posCards.filter(c => getCardStatus(c) === 'learning').length,
    reviewCount: posCards.filter(c => getCardStatus(c) === 'review').length,
    selected: true,
    newCardsPerDay: 10,
    weight: 1,
  };
});

export const mockCollections: FlashcardCollection[] = [
  { id: 'col-default', name: 'Theo từ loại', description: 'Collection mặc định chia theo từ loại', topicCount: POS_LIST.length, totalCards: mockFlashcards.length, isDefault: true },
];

export const defaultFieldConfig: FlashcardFieldConfig[] = [
  { field: 'front', label: 'Từ', showOnFront: true, showOnBack: true },
  { field: 'reading', label: 'Cách đọc', showOnFront: false, showOnBack: true },
  { field: 'back', label: 'Nghĩa', showOnFront: false, showOnBack: true },
  { field: 'partOfSpeech', label: 'Từ loại', showOnFront: false, showOnBack: true },
];

export const mockPresets: FlashcardPreset[] = [
  { id: 'preset-default', name: 'Mặc định', newCardsPerDay: 10, fieldConfig: defaultFieldConfig, topicWeights: {} },
  { id: 'preset-intensive', name: 'Chuyên sâu', newCardsPerDay: 30, fieldConfig: defaultFieldConfig, topicWeights: {} },
];
