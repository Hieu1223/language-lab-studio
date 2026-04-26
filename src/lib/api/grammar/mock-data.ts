import type { GrammarCard, GrammarTopic, GrammarCollection, GrammarListItem } from './types';

export const mockGrammarCards: GrammarCard[] = [
  { id: 'gc-1', pattern: '〜は〜です', meaning: 'A là B (khẳng định)', example: '私は学生です。', exampleTranslation: 'Tôi là học sinh.', topicId: 'gtopic-basic', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-2', pattern: '〜を〜ます', meaning: 'Làm gì đó (tha động từ)', example: 'りんごを食べます。', exampleTranslation: 'Ăn táo.', topicId: 'gtopic-basic', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-3', pattern: '〜たい', meaning: 'Muốn làm gì đó', example: '日本に行きたいです。', exampleTranslation: 'Tôi muốn đi Nhật.', topicId: 'gtopic-basic', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-4', pattern: '〜ている', meaning: 'Đang làm / trạng thái', example: '今、本を読んでいます。', exampleTranslation: 'Bây giờ đang đọc sách.', topicId: 'gtopic-intermediate', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-5', pattern: '〜たら', meaning: 'Nếu / Khi', example: '雨が降ったら、家にいます。', exampleTranslation: 'Nếu trời mưa, tôi ở nhà.', topicId: 'gtopic-intermediate', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-6', pattern: '〜なければならない', meaning: 'Phải làm gì đó', example: '宿題をしなければなりません。', exampleTranslation: 'Phải làm bài tập.', topicId: 'gtopic-intermediate', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-7', pattern: '〜ようにする', meaning: 'Cố gắng làm gì đó', example: '毎日運動するようにしています。', exampleTranslation: 'Tôi cố gắng tập thể dục mỗi ngày.', topicId: 'gtopic-advanced', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-8', pattern: '〜てしまう', meaning: 'Hoàn thành / tiếc nuối', example: 'ケーキを全部食べてしまいました。', exampleTranslation: 'Đã ăn hết bánh rồi.', topicId: 'gtopic-advanced', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
];

const TOPIC_NAMES = ['Cơ bản', 'Trung cấp', 'Nâng cao'];
const TOPIC_IDS = ['gtopic-basic', 'gtopic-intermediate', 'gtopic-advanced'];

export const mockGrammarTopics: GrammarTopic[] = TOPIC_IDS.map((id, i) => {
  const topicCards = mockGrammarCards.filter(c => c.topicId === id);
  const now = new Date();
  return {
    id,
    name: TOPIC_NAMES[i],
    collectionId: 'gcol-default',
    cardCount: topicCards.length,
    dueCount: topicCards.filter(c => new Date(c.nextReview) <= now).length,
    newCount: topicCards.filter(c => !c.lastReview).length,
    learningCount: topicCards.filter(c => c.lastReview !== null && c.interval <= 7).length,
    reviewCount: topicCards.filter(c => c.lastReview !== null && c.interval > 7).length,
    selected: true,
    newCardsPerDay: 5,
    weight: 1,
  };
});

export const mockGrammarCollections: GrammarCollection[] = [
  { id: 'gcol-default', name: 'Ngữ pháp chung', description: 'Collection mặc định', topicCount: TOPIC_IDS.length, totalCards: mockGrammarCards.length, isDefault: true },
];

export const allGrammarList: GrammarListItem[] = [
  ...mockGrammarCards.map(c => ({ id: c.id, pattern: c.pattern, meaning: c.meaning, addedToTopic: true, topicId: c.topicId })),
  { id: 'gl-9', pattern: '〜ことがある', meaning: 'Đã từng / có lúc', addedToTopic: false, topicId: null },
  { id: 'gl-10', pattern: '〜ばかり', meaning: 'Chỉ toàn / vừa mới', addedToTopic: false, topicId: null },
  { id: 'gl-11', pattern: '〜わけではない', meaning: 'Không hẳn là', addedToTopic: false, topicId: null },
  { id: 'gl-12', pattern: '〜に違いない', meaning: 'Chắc chắn là', addedToTopic: false, topicId: null },
  { id: 'gl-13', pattern: '〜ものの', meaning: 'Mặc dù', addedToTopic: false, topicId: null },
];
