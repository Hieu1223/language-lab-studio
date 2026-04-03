import type { TranscriptionResponse, HistoryEntry } from './types';
import { mockHistory } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

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

export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResponse> {
  await delay(1500);
  return {
    id: `tr-${Date.now()}`,
    videoUrl,
    title: 'Japanese Lesson - ' + new Date().toLocaleDateString(),
    transcript: { segments: mockSegments },
    createdAt: new Date().toISOString(),
    isPublic: false,
    userId: 'current-user',
    language: 'ja',
  };
}

export async function getHistory(): Promise<HistoryEntry[]> {
  await delay(300);
  return [...mockHistory];
}

export async function getMyTranscripts(): Promise<TranscriptionResponse[]> {
  await delay(400);
  return [
    { id: 'my-1', videoUrl: 'https://youtube.com/watch?v=abc123', title: 'My First Transcript - 初めての文字起こし', transcript: { segments: mockSegments }, createdAt: '2026-04-01T10:00:00Z', isPublic: false, userId: 'current-user', language: 'ja' },
    { id: 'my-2', videoUrl: 'https://youtube.com/watch?v=def456', title: 'Cooking Vocabulary - 料理の単語', transcript: { segments: mockSegments }, createdAt: '2026-03-28T14:00:00Z', isPublic: true, userId: 'current-user', language: 'ja' },
  ];
}
