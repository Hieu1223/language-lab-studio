import type {
  Transcript, TranscriptionHistory, TranscriptResult, TranscriptSegment, YouTubeVideo,
  TranscriptionFilter, ClozeSettings,
  VideoPlayerSettings, TokenInfo, TokenizedResult, TokenTimestamp,
  TranscriptRequestResponse, TranscriptStatusResponse, TranscriptInfoResponse,
  YoutubeTranscriptRequestForm
} from './types';
import {
  mockTranscripts, mockTranscriptionHistories, mockYouTubeVideos,
  mockTokenSegments, mockTokenize
} from './mock-data';

export type {
  Transcript, TranscriptionHistory, TranscriptResult, TranscriptSegment, YouTubeVideo,
  TranscriptionFilter, ClozeSettings,
  VideoPlayerSettings, TokenInfo, TokenizedResult, TokenTimestamp,
  TranscriptRequestResponse, TranscriptStatusResponse, TranscriptInfoResponse,
  YoutubeTranscriptRequestForm
} from './types';

export { TranscriptStatus } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let transcripts = [...mockTranscripts];
let histories = [...mockTranscriptionHistories];

// ─── YouTube Videos ─────────────────────────────────────────────────────
export async function searchYouTubeVideos(userId: string, query: string): Promise<YouTubeVideo[]> {
  await delay(400);
  if (!query) return [...mockYouTubeVideos];
  const q = query.toLowerCase();
  return mockYouTubeVideos.filter(v => v.title.toLowerCase().includes(q) || v.channelName.toLowerCase().includes(q));
}

// ─── Transcripts ────────────────────────────────────────────────────────
export async function getMyTranscripts(userId: string, filter: TranscriptionFilter): Promise<Transcript[]> {
  await delay(300);
  let results = [...transcripts];
  if (filter.status !== 'all') results = results.filter(t => t.status === filter.status);
  if (filter.sourceSite !== 'all') results = results.filter(t => t.original_source === filter.sourceSite);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    results = results.filter(t => t.name.toLowerCase().includes(q));
  }
  return results;
}

export async function getTranscript(transcriptId: string): Promise<Transcript> {
  await delay(200);
  const t = transcripts.find(t => t.id === transcriptId);
  if (!t) throw new Error('Transcript not found');
  return t;
}

export async function getTranscriptData(transcriptId: string): Promise<TranscriptResult | null> {
  await delay(200);
  const t = transcripts.find(t => t.id === transcriptId);
  if (!t || !t.data) return null;
  return JSON.parse(t.data) as TranscriptResult;
}

export async function requestTranscription(userId: string, form: YoutubeTranscriptRequestForm): Promise<TranscriptRequestResponse> {
  await delay(1500);
  const newTranscript: Transcript = {
    id: `tr-${Date.now()}`,
    original_source: form.original_source,
    resource_id: form.resource_id,
    resource_url: form.resource_url,
    thumnail_url: form.thumbnail_url,
    name: form.name,
    date_created: new Date().toISOString(),
    data: JSON.stringify({ segments: mockTokenSegments }),
    status: 3,
    public: form.public,
  };
  transcripts = [newTranscript, ...transcripts];
  const history: TranscriptionHistory = {
    id: `th-${Date.now()}`,
    transcript_id: newTranscript.id,
    job_status: 'done',
    queued_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    error: null,
  };
  histories = [history, ...histories];
  return { transcript_id: newTranscript.id, success: true };
}

export async function getTranscriptStatus(userId: string, transcriptId: string): Promise<TranscriptStatusResponse> {
  await delay(200);
  const t = transcripts.find(t => t.id === transcriptId);
  if (!t) return { done: false, msg: 'Transcript not found' };
  return { done: t.status === 3, msg: t.status === 3 ? 'Finished' : 'Processing' };
}

export async function getTranscriptInfo(userId: string, transcriptId: string): Promise<TranscriptInfoResponse> {
  await delay(200);
  const t = transcripts.find(t => t.id === transcriptId);
  if (!t) throw new Error('Transcript not found');
  return {
    id: t.id,
    original_source: t.original_source,
    thumnail_url: t.thumnail_url,
    resource_url: t.resource_url,
    resource_id: t.resource_id,
    status: t.status,
  };
}

// ─── Tokenizer ──────────────────────────────────────────────────────────
export async function tokenizeText(userId: string, text: string): Promise<TokenizedResult> {
  await delay(500);
  return { original: text, tokens: mockTokenize(text) };
}

// ─── Cloze Helpers ──────────────────────────────────────────────────────
export function getDefaultClozeSettings(): ClozeSettings {
  return {
    mode: 'classic',
    minWordsInCloze: 1,
    maxWordsInCloze: 2,
    minGapBetweenCloze: 2,
    maxGapBetweenCloze: 5,
    windowSize: 3,
    windowOffset: 0,
  };
}

export function getDefaultVideoPlayerSettings(): VideoPlayerSettings {
  return { playbackRate: 1, seekDuration: 5 };
}

export function generateClozeIndices(
  segments: TranscriptSegment[],
  settings: ClozeSettings,
  _currentTime: number
): Set<string> {
  const indices = new Set<string>();

  // Only classic mode
  let gapCounter = 0;
  let clozeCounter = 0;
  let inCloze = false;
  const targetGap = settings.minGapBetweenCloze + Math.floor(Math.random() * (settings.maxGapBetweenCloze - settings.minGapBetweenCloze + 1));
  const targetClozeLen = settings.minWordsInCloze + Math.floor(Math.random() * (settings.maxWordsInCloze - settings.minWordsInCloze + 1));

  segments.forEach((seg, si) => {
    seg.words.forEach((_, wi) => {
      if (!inCloze) {
        gapCounter++;
        if (gapCounter >= targetGap) {
          inCloze = true;
          clozeCounter = 0;
          gapCounter = 0;
        }
      }
      if (inCloze) {
        indices.add(`${si}-${wi}`);
        clozeCounter++;
        if (clozeCounter >= targetClozeLen) {
          inCloze = false;
          gapCounter = 0;
        }
      }
    });
  });

  return indices;
}
