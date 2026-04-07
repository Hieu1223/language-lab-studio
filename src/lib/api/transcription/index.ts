import type {
  Transcript, TranscriptionHistory, TranscriptResult, TranscriptSegment, YouTubeVideo,
  YouTubeChannel, PublicTranscript, TranscriptionFilter, ClozeSettings,
  VideoPlayerSettings, TokenInfo, TokenizedResult, TokenTimestamp, ClozeMode,
  TranscriptRequestResponse, TranscriptStatusResponse, TranscriptInfoResponse,
  YoutubeTranscriptRequestForm
} from './types';
import {
  mockTranscripts, mockTranscriptionHistories, mockYouTubeVideos, mockChannels,
  mockPublicTranscripts, mockTokenSegments, mockTokenize
} from './mock-data';

export type {
  Transcript, TranscriptionHistory, TranscriptResult, TranscriptSegment, YouTubeVideo,
  YouTubeChannel, PublicTranscript, TranscriptionFilter, ClozeSettings,
  VideoPlayerSettings, TokenInfo, TokenizedResult, TokenTimestamp, ClozeMode,
  TranscriptRequestResponse, TranscriptStatusResponse, TranscriptInfoResponse,
  YoutubeTranscriptRequestForm
} from './types';

export { TranscriptStatus } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let transcripts = [...mockTranscripts];
let histories = [...mockTranscriptionHistories];
let channels = [...mockChannels];

// ─── YouTube Videos ─────────────────────────────────────────────────────
export async function searchYouTubeVideos(query: string): Promise<YouTubeVideo[]> {
  await delay(400);
  if (!query) return [...mockYouTubeVideos];
  const q = query.toLowerCase();
  return mockYouTubeVideos.filter(v => v.title.toLowerCase().includes(q) || v.channelName.toLowerCase().includes(q));
}

export async function getVideosByChannel(channelId: string): Promise<YouTubeVideo[]> {
  await delay(300);
  return mockYouTubeVideos.filter(v => v.channelId === channelId);
}

// ─── Channels ───────────────────────────────────────────────────────────
export async function getChannels(): Promise<YouTubeChannel[]> {
  await delay(200);
  return [...channels];
}

export async function getSubscribedChannels(): Promise<YouTubeChannel[]> {
  await delay(200);
  return channels.filter(c => c.isSubscribed);
}

export async function toggleChannelSubscription(channelId: string): Promise<YouTubeChannel> {
  await delay(200);
  channels = channels.map(c => c.id === channelId ? { ...c, isSubscribed: !c.isSubscribed } : c);
  return channels.find(c => c.id === channelId)!;
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

export async function requestTranscription(form: YoutubeTranscriptRequestForm): Promise<TranscriptRequestResponse> {
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
    status: 3, // Simulate instant finish
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

export async function getTranscriptStatus(transcriptId: string): Promise<TranscriptStatusResponse> {
  await delay(200);
  const t = transcripts.find(t => t.id === transcriptId);
  if (!t) return { done: false, msg: 'Transcript not found' };
  return { done: t.status === 3, msg: t.status === 3 ? 'Finished' : 'Processing' };
}

export async function getTranscriptInfo(transcriptId: string): Promise<TranscriptInfoResponse> {
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

export async function* streamTranscript(transcriptId: string) {
  for (const seg of mockTokenSegments) {
    await delay(800);
    yield seg;
  }
}

// ─── Public Transcripts ─────────────────────────────────────────────────
export async function getPublicTranscripts(search: string): Promise<PublicTranscript[]> {
  await delay(300);
  if (!search) return [...mockPublicTranscripts];
  const q = search.toLowerCase();
  return mockPublicTranscripts.filter(p => p.title.toLowerCase().includes(q));
}

// ─── Tokenizer ──────────────────────────────────────────────────────────
export async function tokenizeText(text: string): Promise<TokenizedResult> {
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
  currentTime: number
): Set<string> {
  const indices = new Set<string>();

  if (settings.mode === 'classic') {
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
  } else if (settings.mode === 'listening') {
    segments.forEach((seg, si) => {
      seg.words.forEach((word, wi) => {
        if (word.start === null) return;
        const dist = Math.abs(word.start - currentTime);
        if (dist < settings.windowSize * 0.5) {
          indices.add(`${si}-${wi}`);
        }
      });
    });
  } else if (settings.mode === 'reading') {
    segments.forEach((seg, si) => {
      seg.words.forEach((word, wi) => {
        if (word.start === null) return;
        const dist = Math.abs(word.start - currentTime + settings.windowOffset);
        if (dist >= settings.windowSize * 0.5) {
          indices.add(`${si}-${wi}`);
        }
      });
    });
  }

  return indices;
}
