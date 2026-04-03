import type { TranscriptionResponse, HistoryEntry } from './types';
import { mockHistory } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Mock transcript segments
const mockSegments = [
  { text: 'Xin chào các bạn, hôm nay chúng ta sẽ học tiếng Việt.', words: [
    { start: 0, end: 0.5, token: 'Xin' }, { start: 0.5, end: 1, token: 'chào' },
    { start: 1, end: 1.5, token: 'các' }, { start: 1.5, end: 2, token: 'bạn,' },
    { start: 2, end: 2.5, token: 'hôm' }, { start: 2.5, end: 3, token: 'nay' },
    { start: 3, end: 3.5, token: 'chúng' }, { start: 3.5, end: 4, token: 'ta' },
    { start: 4, end: 4.5, token: 'sẽ' }, { start: 4.5, end: 5, token: 'học' },
    { start: 5, end: 5.5, token: 'tiếng' }, { start: 5.5, end: 6, token: 'Việt.' },
  ]},
  { text: 'Bài học này rất thú vị và bổ ích.', words: [
    { start: 6, end: 6.5, token: 'Bài' }, { start: 6.5, end: 7, token: 'học' },
    { start: 7, end: 7.5, token: 'này' }, { start: 7.5, end: 8, token: 'rất' },
    { start: 8, end: 8.5, token: 'thú' }, { start: 8.5, end: 9, token: 'vị' },
    { start: 9, end: 9.5, token: 'và' }, { start: 9.5, end: 10, token: 'bổ' },
    { start: 10, end: 10.5, token: 'ích.' },
  ]},
];

export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResponse> {
  await delay(1500);
  return {
    id: `tr-${Date.now()}`,
    videoUrl,
    title: 'Vietnamese Lesson - ' + new Date().toLocaleDateString(),
    transcript: { segments: mockSegments },
    createdAt: new Date().toISOString(),
    isPublic: false,
    userId: 'current-user',
    language: 'vi',
  };
}

export async function getHistory(): Promise<HistoryEntry[]> {
  await delay(300);
  return [...mockHistory];
}

export async function getMyTranscripts(): Promise<TranscriptionResponse[]> {
  await delay(400);
  return [
    { id: 'my-1', videoUrl: 'https://youtube.com/watch?v=abc123', title: 'My First Transcript', transcript: { segments: mockSegments }, createdAt: '2026-04-01T10:00:00Z', isPublic: false, userId: 'current-user', language: 'vi' },
    { id: 'my-2', videoUrl: 'https://youtube.com/watch?v=def456', title: 'Cooking Vocabulary', transcript: { segments: mockSegments }, createdAt: '2026-03-28T14:00:00Z', isPublic: true, userId: 'current-user', language: 'vi' },
  ];
}
