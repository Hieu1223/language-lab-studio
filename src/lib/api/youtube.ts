import type { TranscriptResult } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface YouTubeVideo {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  viewCount: string;
  publishedAt: string;
  duration: string;
}

export const mockYouTubeVideos: YouTubeVideo[] = [
  { id: 'yt-1', title: '【初心者向け】日本語の基本あいさつ', channelName: 'NihonGo Sensei', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '125K', publishedAt: '2 tuần trước', duration: '12:34' },
  { id: 'yt-2', title: 'JLPT N5 文法まとめ - Ngữ pháp N5', channelName: 'Japanese Pod', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '89K', publishedAt: '1 tháng trước', duration: '24:15' },
  { id: 'yt-3', title: '日本の料理 - Nấu ăn kiểu Nhật', channelName: 'Cooking Japan', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '342K', publishedAt: '3 ngày trước', duration: '18:42' },
  { id: 'yt-4', title: '東京散歩 - Dạo phố Tokyo', channelName: 'Walk Japan', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '567K', publishedAt: '1 tuần trước', duration: '45:00' },
  { id: 'yt-5', title: 'アニメで学ぶ日本語 - Học qua anime', channelName: 'Anime Japanese', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '234K', publishedAt: '5 ngày trước', duration: '15:30' },
  { id: 'yt-6', title: '日本語能力試験 N3 リスニング', channelName: 'JLPT Master', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '178K', publishedAt: '2 tháng trước', duration: '32:10' },
  { id: 'yt-7', title: 'ビジネス日本語 - Tiếng Nhật công sở', channelName: 'Business JP', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '67K', publishedAt: '4 ngày trước', duration: '20:55' },
  { id: 'yt-8', title: '日本の文化と伝統 - Văn hoá Nhật', channelName: 'Japan Culture', thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', viewCount: '445K', publishedAt: '1 tuần trước', duration: '28:33' },
];

const mockTranscriptSegments = [
  { text: 'みなさん、こんにちは。今日は日本語を勉強しましょう。', words: [
    { start: 0, end: 0.8, token: 'みなさん' }, { start: 0.8, end: 1.0, token: '、' }, { start: 1.0, end: 1.8, token: 'こんにちは' }, { start: 1.8, end: 2.0, token: '。' },
    { start: 2.0, end: 2.5, token: '今日' }, { start: 2.5, end: 2.7, token: 'は' }, { start: 2.7, end: 3.5, token: '日本語' }, { start: 3.5, end: 3.7, token: 'を' },
    { start: 3.7, end: 4.3, token: '勉強' }, { start: 4.3, end: 5.0, token: 'しましょう' }, { start: 5.0, end: 5.2, token: '。' },
  ]},
  { text: 'この授業はとても面白いです。', words: [
    { start: 5.5, end: 6.0, token: 'この' }, { start: 6.0, end: 6.5, token: '授業' }, { start: 6.5, end: 6.7, token: 'は' },
    { start: 6.7, end: 7.2, token: 'とても' }, { start: 7.2, end: 7.8, token: '面白い' }, { start: 7.8, end: 8.2, token: 'です' }, { start: 8.2, end: 8.4, token: '。' },
  ]},
  { text: '日本語の文法は難しいですが、頑張りましょう。', words: [
    { start: 9.0, end: 9.5, token: '日本語' }, { start: 9.5, end: 9.7, token: 'の' }, { start: 9.7, end: 10.2, token: '文法' }, { start: 10.2, end: 10.4, token: 'は' },
    { start: 10.4, end: 11.0, token: '難しい' }, { start: 11.0, end: 11.3, token: 'です' }, { start: 11.3, end: 11.5, token: 'が' }, { start: 11.5, end: 11.7, token: '、' },
    { start: 11.7, end: 12.3, token: '頑張り' }, { start: 12.3, end: 13.0, token: 'ましょう' }, { start: 13.0, end: 13.2, token: '。' },
  ]},
  { text: '毎日少しずつ練習することが大切です。', words: [
    { start: 13.5, end: 14.0, token: '毎日' }, { start: 14.0, end: 14.5, token: '少し' }, { start: 14.5, end: 14.8, token: 'ずつ' },
    { start: 14.8, end: 15.3, token: '練習' }, { start: 15.3, end: 15.6, token: 'する' }, { start: 15.6, end: 15.9, token: 'こと' }, { start: 15.9, end: 16.1, token: 'が' },
    { start: 16.1, end: 16.6, token: '大切' }, { start: 16.6, end: 17.0, token: 'です' }, { start: 17.0, end: 17.2, token: '。' },
  ]},
];

export async function searchYouTubeVideos(query: string): Promise<YouTubeVideo[]> {
  await delay(500);
  if (!query) return mockYouTubeVideos;
  const q = query.toLowerCase();
  return mockYouTubeVideos.filter(v => v.title.toLowerCase().includes(q) || v.channelName.toLowerCase().includes(q));
}

export async function transcribeVideo(videoId: string): Promise<TranscriptResult> {
  await delay(1500);
  return { segments: mockTranscriptSegments };
}

export async function* streamTranscript(videoId: string) {
  for (const seg of mockTranscriptSegments) {
    await delay(800);
    yield seg;
  }
}
