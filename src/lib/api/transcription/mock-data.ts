import type { TranscriptionResponse, YouTubeVideo, YouTubeChannel, PublicTranscript, TokenInfo } from './types';
import type { PartOfSpeech } from '../common/types';

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

export const mockTranscriptions: TranscriptionResponse[] = [
  { id: 'tr-1', videoUrl: 'https://youtube.com/watch?v=abc123', title: 'Bài học tiếng Nhật cho người mới bắt đầu', thumbnailUrl: 'https://img.youtube.com/vi/abc123/mqdefault.jpg', sourceSite: 'youtube', status: 'completed', transcript: { segments: mockSegments }, createdAt: '2026-04-01T10:00:00Z', isPublic: false, userId: 'current-user', language: 'ja' },
  { id: 'tr-2', videoUrl: 'https://youtube.com/watch?v=def456', title: 'Từ vựng nấu ăn - 料理の単語', thumbnailUrl: 'https://img.youtube.com/vi/def456/mqdefault.jpg', sourceSite: 'youtube', status: 'completed', transcript: { segments: mockSegments }, createdAt: '2026-03-28T14:00:00Z', isPublic: true, userId: 'current-user', language: 'ja' },
  { id: 'tr-3', videoUrl: '', title: 'Ghi âm bài giảng tuần 5', thumbnailUrl: '', sourceSite: 'upload', status: 'processing', transcript: null, createdAt: '2026-04-03T09:00:00Z', isPublic: false, userId: 'current-user', language: 'ja' },
  { id: 'tr-4', videoUrl: 'https://youtube.com/watch?v=ghi789', title: 'JLPT N3 Listening Practice', thumbnailUrl: 'https://img.youtube.com/vi/ghi789/mqdefault.jpg', sourceSite: 'youtube', status: 'pending', transcript: null, createdAt: '2026-04-04T08:00:00Z', isPublic: false, userId: 'current-user', language: 'ja' },
];

export const mockYouTubeVideos: YouTubeVideo[] = [
  { id: 'yt-1', title: '【初心者向け】日本語の基本あいさつ', channelName: 'NihonGo Sensei', channelId: 'ch-1', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '125K', publishedAt: '2 tuần trước', duration: '12:34', isTranscribed: true },
  { id: 'yt-2', title: 'JLPT N5 文法まとめ - Ngữ pháp N5', channelName: 'Japanese Pod', channelId: 'ch-2', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '89K', publishedAt: '1 tháng trước', duration: '24:15', isTranscribed: false },
  { id: 'yt-3', title: '日本の料理 - Nấu ăn kiểu Nhật', channelName: 'Cooking Japan', channelId: 'ch-3', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '342K', publishedAt: '3 ngày trước', duration: '18:42', isTranscribed: false },
  { id: 'yt-4', title: '東京散歩 - Dạo phố Tokyo', channelName: 'Walk Japan', channelId: 'ch-1', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '567K', publishedAt: '1 tuần trước', duration: '45:00', isTranscribed: true },
  { id: 'yt-5', title: 'アニメで学ぶ日本語 - Học qua anime', channelName: 'Anime Japanese', channelId: 'ch-4', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '234K', publishedAt: '5 ngày trước', duration: '15:30', isTranscribed: false },
  { id: 'yt-6', title: '日本語能力試験 N3 リスニング', channelName: 'JLPT Master', channelId: 'ch-5', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '178K', publishedAt: '2 tháng trước', duration: '32:10', isTranscribed: false },
  { id: 'yt-7', title: 'ビジネス日本語 - Tiếng Nhật công sở', channelName: 'Business JP', channelId: 'ch-6', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '67K', publishedAt: '4 ngày trước', duration: '20:55', isTranscribed: false },
  { id: 'yt-8', title: '日本の文化と伝統 - Văn hoá Nhật', channelName: 'Japan Culture', channelId: 'ch-1', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '445K', publishedAt: '1 tuần trước', duration: '28:33', isTranscribed: false },
];

export const mockChannels: YouTubeChannel[] = [
  { id: 'ch-1', name: 'NihonGo Sensei', avatarUrl: '', subscriberCount: '250K', isSubscribed: true },
  { id: 'ch-2', name: 'Japanese Pod', avatarUrl: '', subscriberCount: '180K', isSubscribed: false },
  { id: 'ch-3', name: 'Cooking Japan', avatarUrl: '', subscriberCount: '500K', isSubscribed: true },
  { id: 'ch-4', name: 'Anime Japanese', avatarUrl: '', subscriberCount: '320K', isSubscribed: false },
  { id: 'ch-5', name: 'JLPT Master', avatarUrl: '', subscriberCount: '150K', isSubscribed: false },
  { id: 'ch-6', name: 'Business JP', avatarUrl: '', subscriberCount: '80K', isSubscribed: false },
];

export const mockPublicTranscripts: PublicTranscript[] = [
  { id: 'pt-1', title: 'Tiếng Nhật cho người mới - あいさつ', videoUrl: 'https://youtube.com/watch?v=abc123', thumbnailUrl: 'https://img.youtube.com/vi/abc123/mqdefault.jpg', sourceSite: 'youtube', language: 'ja', createdAt: '2026-03-28T10:00:00Z', userId: 'user-1', userName: 'TanakaLearner', viewCount: 342 },
  { id: 'pt-2', title: 'Hội thoại hàng ngày ở Tokyo', videoUrl: 'https://youtube.com/watch?v=def456', thumbnailUrl: 'https://img.youtube.com/vi/def456/mqdefault.jpg', sourceSite: 'youtube', language: 'ja', createdAt: '2026-03-25T14:00:00Z', userId: 'user-2', userName: 'JapanExplorer', viewCount: 128 },
  { id: 'pt-3', title: 'Chương trình nấu ăn Nhật - ラーメン', videoUrl: 'https://youtube.com/watch?v=ghi789', thumbnailUrl: 'https://img.youtube.com/vi/ghi789/mqdefault.jpg', sourceSite: 'youtube', language: 'ja', createdAt: '2026-03-20T08:00:00Z', userId: 'user-3', userName: 'FoodieJP', viewCount: 567 },
];

export const mockTokenSegments = mockSegments;

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
