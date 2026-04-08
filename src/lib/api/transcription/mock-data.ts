import type { Transcript, TranscriptionHistory, YouTubeVideo, TokenInfo, TranscriptSegment } from './types';

const mockSegments: TranscriptSegment[] = [
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
  { text: '日本語の文法は難しいですが、頑張りましょう。', words: [
    { start: 8, end: 8.5, token: '日本語' }, { start: 8.5, end: 8.7, token: 'の' },
    { start: 8.7, end: 9.2, token: '文法は' }, { start: 9.2, end: 9.8, token: '難しい' },
    { start: 9.8, end: 10.2, token: 'ですが、' }, { start: 10.2, end: 11, token: '頑張り' },
    { start: 11, end: 11.5, token: 'ましょう。' },
  ]},
  { text: '毎日少しずつ練習することが大切です。', words: [
    { start: 12, end: 12.5, token: '毎日' }, { start: 12.5, end: 13, token: '少し' },
    { start: 13, end: 13.3, token: 'ずつ' }, { start: 13.3, end: 13.8, token: '練習' },
    { start: 13.8, end: 14.1, token: 'する' }, { start: 14.1, end: 14.4, token: 'ことが' },
    { start: 14.4, end: 14.9, token: '大切' }, { start: 14.9, end: 15.3, token: 'です。' },
  ]},
];

export const mockTranscripts: Transcript[] = [
  { id: 'tr-1', original_source: 'Youtube', resource_id: 'yt-1', resource_url: 'https://youtube.com/watch?v=yt-1', thumnail_url: 'https://placehold.co/320x180/58cc02/fff?text=挨拶', name: '日本語の挨拶 - Chào hỏi tiếng Nhật', date_created: '2026-04-01T10:00:00Z', data: JSON.stringify({ segments: mockSegments }), status: 3, public: true },
  { id: 'tr-2', original_source: 'Youtube', resource_id: 'yt-4', resource_url: 'https://youtube.com/watch?v=yt-4', thumnail_url: 'https://placehold.co/320x180/7c4dff/fff?text=アニメ学習', name: 'アニメで学ぶ日本語', date_created: '2026-04-03T14:00:00Z', data: JSON.stringify({ segments: mockSegments }), status: 3, public: false },
  { id: 'tr-3', original_source: 'FileUpload', resource_id: null, resource_url: '', thumnail_url: '', name: 'Ghi âm bài giảng tuần 5', date_created: '2026-04-03T09:00:00Z', data: null, status: 2, public: false },
];

export const mockTranscriptionHistories: TranscriptionHistory[] = [
  { id: 'th-1', transcript_id: 'tr-1', job_status: 'done', queued_at: '2026-04-01T09:58:00Z', started_at: '2026-04-01T09:59:00Z', finished_at: '2026-04-01T10:00:00Z', error: null },
  { id: 'th-2', transcript_id: 'tr-2', job_status: 'done', queued_at: '2026-03-28T13:58:00Z', started_at: '2026-03-28T13:59:00Z', finished_at: '2026-03-28T14:00:00Z', error: null },
];

export const mockYouTubeVideos: YouTubeVideo[] = [
  { id: 'yt-1', title: '【初心者向け】日本語の基本あいさつ', channelName: 'NihonGo Sensei', channelId: 'ch-1', thumbnailUrl: 'https://placehold.co/320x180/58cc02/fff?text=挨拶', viewCount: '125K', publishedAt: '2 tuần trước', duration: '12:34', isTranscribed: true },
  { id: 'yt-2', title: 'JLPT N5 文法まとめ - Ngữ pháp N5', channelName: 'Japanese Pod', channelId: 'ch-2', thumbnailUrl: 'https://placehold.co/320x180/1a1a2e/58cc02?text=N5', viewCount: '89K', publishedAt: '1 tháng trước', duration: '24:15', isTranscribed: false },
  { id: 'yt-3', title: '日本の料理 - Nấu ăn kiểu Nhật', channelName: 'Cooking Japan', channelId: 'ch-3', thumbnailUrl: 'https://placehold.co/320x180/e91e63/fff?text=料理', viewCount: '342K', publishedAt: '3 ngày trước', duration: '18:42', isTranscribed: false },
  { id: 'yt-4', title: '東京散歩 - Dạo phố Tokyo', channelName: 'Walk Japan', channelId: 'ch-1', thumbnailUrl: 'https://placehold.co/320x180/7c4dff/fff?text=東京', viewCount: '567K', publishedAt: '1 tuần trước', duration: '45:00', isTranscribed: true },
  { id: 'yt-5', title: 'アニメで学ぶ日本語 - Học qua anime', channelName: 'Anime Japanese', channelId: 'ch-4', thumbnailUrl: 'https://placehold.co/320x180/ff6b35/fff?text=アニメ', viewCount: '234K', publishedAt: '5 ngày trước', duration: '15:30', isTranscribed: false },
  { id: 'yt-6', title: '漢字の覚え方 - Cách nhớ Kanji', channelName: 'KanjiPro', channelId: 'ch-5', thumbnailUrl: 'https://placehold.co/320x180/00bcd4/fff?text=漢字', viewCount: '178K', publishedAt: '2 tháng trước', duration: '32:10', isTranscribed: false },
];

export const mockTokenSegments = mockSegments;

export function mockTokenize(text: string): TokenInfo[] {
  const segments = text.match(/[\u4e00-\u9faf]+|[\u3040-\u309f]+|[\u30a0-\u30ff]+|[a-zA-Z]+|[^\s]/g) || [];
  return segments.map((w, i) => ({
    token: w,
    partOfSpeech: ['名詞', '動詞', '助詞', '形容詞'][i % 4],
    meaning: `[nghĩa của "${w}"]`,
    romanization: w,
  }));
}
