import type { GrammarCard, GrammarTopic, GrammarCollection, GrammarListItem } from './types';
import type { JLPTLevel } from '../common/types';

export const mockGrammarCards: GrammarCard[] = [
  { id: 'gc-1', pattern: '〜は〜です', meaning: 'A là B (khẳng định)', example: '私は学生です。', exampleTranslation: 'Tôi là học sinh.', level: 'N5', topicId: 'gtopic-N5', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-2', pattern: '〜を〜ます', meaning: 'Làm gì đó (tha động từ)', example: 'りんごを食べます。', exampleTranslation: 'Ăn táo.', level: 'N5', topicId: 'gtopic-N5', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-3', pattern: '〜たい', meaning: 'Muốn làm gì đó', example: '日本に行きたいです。', exampleTranslation: 'Tôi muốn đi Nhật.', level: 'N5', topicId: 'gtopic-N5', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-4', pattern: '〜ている', meaning: 'Đang làm / trạng thái', example: '今、本を読んでいます。', exampleTranslation: 'Bây giờ đang đọc sách.', level: 'N4', topicId: 'gtopic-N4', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-5', pattern: '〜たら', meaning: 'Nếu / Khi', example: '雨が降ったら、家にいます。', exampleTranslation: 'Nếu trời mưa, tôi ở nhà.', level: 'N4', topicId: 'gtopic-N4', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-6', pattern: '〜なければならない', meaning: 'Phải làm gì đó', example: '宿題をしなければなりません。', exampleTranslation: 'Phải làm bài tập.', level: 'N4', topicId: 'gtopic-N4', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-7', pattern: '〜ようにする', meaning: 'Cố gắng làm gì đó', example: '毎日運動するようにしています。', exampleTranslation: 'Tôi cố gắng tập thể dục mỗi ngày.', level: 'N3', topicId: 'gtopic-N3', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
  { id: 'gc-8', pattern: '〜てしまう', meaning: 'Hoàn thành / tiếc nuối', example: 'ケーキを全部食べてしまいました。', exampleTranslation: 'Đã ăn hết bánh rồi.', level: 'N3', topicId: 'gtopic-N3', collectionId: 'gcol-default', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null },
];

const JLPT_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const mockGrammarTopics: GrammarTopic[] = JLPT_LEVELS.map(level => {
  const levelCards = mockGrammarCards.filter(c => c.level === level);
  const now = new Date();
  return {
    id: `gtopic-${level}`,
    name: `JLPT ${level}`,
    collectionId: 'gcol-default',
    level,
    cardCount: levelCards.length,
    dueCount: levelCards.filter(c => new Date(c.nextReview) <= now).length,
    newCount: levelCards.filter(c => !c.lastReview).length,
    learningCount: levelCards.filter(c => c.lastReview !== null && c.interval <= 7).length,
    reviewCount: levelCards.filter(c => c.lastReview !== null && c.interval > 7).length,
    selected: true,
    newCardsPerDay: 5,
    weight: 1,
  };
});

export const mockGrammarCollections: GrammarCollection[] = [
  { id: 'gcol-default', name: 'JLPT theo cấp độ', description: 'Collection mặc định chia theo cấp JLPT', topicCount: JLPT_LEVELS.length, totalCards: mockGrammarCards.length, isDefault: true },
];

export const allGrammarList: GrammarListItem[] = [
  ...mockGrammarCards.map(c => ({ id: c.id, pattern: c.pattern, meaning: c.meaning, level: c.level, addedToTopic: true, topicId: c.topicId })),
  { id: 'gl-9', pattern: '〜ことがある', meaning: 'Đã từng / có lúc', level: 'N4', addedToTopic: false, topicId: null },
  { id: 'gl-10', pattern: '〜ばかり', meaning: 'Chỉ toàn / vừa mới', level: 'N3', addedToTopic: false, topicId: null },
  { id: 'gl-11', pattern: '〜わけではない', meaning: 'Không hẳn là', level: 'N2', addedToTopic: false, topicId: null },
  { id: 'gl-12', pattern: '〜に違いない', meaning: 'Chắc chắn là', level: 'N2', addedToTopic: false, topicId: null },
  { id: 'gl-13', pattern: '〜ものの', meaning: 'Mặc dù', level: 'N1', addedToTopic: false, topicId: null },
];
