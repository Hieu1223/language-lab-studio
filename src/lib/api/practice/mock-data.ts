import type { SentencePractice, ClozeFillItem, SentenceFillItem } from './types';

export const mockSentences: SentencePractice[] = [
  { id: 'sp-1', japanese: '私は毎日学校に行きます。', vietnamese: 'Tôi đi học mỗi ngày.', difficulty: 'beginner', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null, creditCost: 1 },
  { id: 'sp-2', japanese: 'ラーメンを食べたいですか？', vietnamese: 'Bạn có muốn ăn ramen không?', difficulty: 'beginner', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null, creditCost: 1 },
  { id: 'sp-3', japanese: '今日の天気はとても良いです。', vietnamese: 'Thời tiết hôm nay rất tốt.', difficulty: 'intermediate', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null, creditCost: 2 },
  { id: 'sp-4', japanese: '私は日本に三年間住んでいます。', vietnamese: 'Tôi đã sống ở Nhật ba năm.', difficulty: 'intermediate', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null, creditCost: 2 },
  { id: 'sp-5', japanese: '雨が降ったら、家にいます。', vietnamese: 'Nếu trời mưa, tôi ở nhà.', difficulty: 'advanced', interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: new Date().toISOString(), lastReview: null, creditCost: 3 },
];

export const mockClozeFillItems: ClozeFillItem[] = [
  { id: 'cf-1', sentence: '私は毎日学校に___ます。', clozedWord: '行き', clozedIndex: 4, options: ['行き', '食べ', '見', '書き'], correctOption: '行き' },
  { id: 'cf-2', sentence: '___を食べたいですか？', clozedWord: 'ラーメン', clozedIndex: 0, options: ['ラーメン', 'すし', 'パン', 'ごはん'], correctOption: 'ラーメン' },
];

export const mockSentenceFillItems: SentenceFillItem[] = [
  { id: 'sf-1', meaning: 'Tôi đi học mỗi ngày.', options: ['私は毎日学校に行きます。', '私は毎日公園に行きます。', '私は毎日家に帰ります。', '私は毎日テレビを見ます。'], correctOption: '私は毎日学校に行きます。' },
  { id: 'sf-2', meaning: 'Thời tiết hôm nay rất tốt.', options: ['今日の天気はとても良いです。', '今日の天気は悪いです。', '昨日の天気は良かったです。', '明日の天気は寒いです。'], correctOption: '今日の天気はとても良いです。' },
];
