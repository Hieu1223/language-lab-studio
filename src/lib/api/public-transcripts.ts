import type { PublicTranscript } from './types';
import { mockPublicTranscripts } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let transcripts = [...mockPublicTranscripts];

export async function searchPublicTranscripts(query: string): Promise<PublicTranscript[]> {
  await delay(400);
  if (!query) return transcripts;
  const q = query.toLowerCase();
  return transcripts.filter(t => t.title.toLowerCase().includes(q) || t.userName.toLowerCase().includes(q));
}

export async function getPublicTranscript(id: string): Promise<PublicTranscript | null> {
  await delay(200);
  return transcripts.find(t => t.id === id) ?? null;
}

export async function makeTranscriptPublic(transcriptId: string): Promise<void> {
  await delay(300);
}
