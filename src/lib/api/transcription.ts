import type { TranscriptionResponse, HistoryEntry } from './types';
import { mockHistory, mockTranscriptions } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let transcriptions = [...mockTranscriptions];

export async function getMyTranscriptions(): Promise<TranscriptionResponse[]> {
  await delay(400);
  return [...transcriptions];
}

export async function getTranscription(id: string): Promise<TranscriptionResponse | null> {
  await delay(300);
  return transcriptions.find(t => t.id === id) || null;
}

export async function transcribeVideo(videoUrl: string): Promise<TranscriptionResponse> {
  await delay(1500);
  const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const videoId = isYoutube ? videoUrl.split('v=')[1]?.split('&')[0] || 'new' : '';
  const newTranscription: TranscriptionResponse = {
    id: `tr-${Date.now()}`,
    videoUrl,
    title: isYoutube ? `YouTube Video - ${new Date().toLocaleDateString()}` : `Upload - ${new Date().toLocaleDateString()}`,
    thumbnailUrl: isYoutube ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '',
    sourceSite: isYoutube ? 'youtube' : 'upload',
    status: 'pending',
    transcript: null,
    createdAt: new Date().toISOString(),
    isPublic: false,
    userId: 'current-user',
    language: 'ja',
  };
  transcriptions = [newTranscription, ...transcriptions];
  return newTranscription;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  await delay(300);
  return [...mockHistory];
}
