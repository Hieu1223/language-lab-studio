import type { UserUsage, CreditPack, KeepAliveResponse, HistoryEntry } from './types';

export type { UserUsage, CreditPack, KeepAliveResponse, HistoryEntry };
export type { SRSRating, SRSFields, KeepAliveConfig, PartOfSpeech, PaginatedRequest, PaginatedResponse } from './types';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Credits ────────────────────────────────────────────────────────────
let usage: UserUsage = {
  creditsRemaining: 3,
  creditsUsedTotal: 12,
  dailyCredits: 5,
  dailyCreditsUsed: 2,
};

const creditPacks: CreditPack[] = [
  { id: 'pack-10', credits: 10, price: 1.99, currency: '$', popular: false },
  { id: 'pack-50', credits: 50, price: 7.99, currency: '$', popular: true },
  { id: 'pack-100', credits: 100, price: 12.99, currency: '$', popular: false },
  { id: 'pack-500', credits: 500, price: 49.99, currency: '$', popular: false },
  { id: 'pack-1000', credits: 1000, price: 79.99, currency: '$', popular: false },
];

export async function getUserUsage(userId: string): Promise<UserUsage> {
  await delay(200);
  return { ...usage };
}

export async function getCreditPacks(): Promise<CreditPack[]> {
  await delay(200);
  return [...creditPacks];
}

export async function canSpendCredits(userId: string, amount: number): Promise<boolean> {
  await delay(100);
  return usage.creditsRemaining >= amount;
}

export async function spendCredits(userId: string, amount: number): Promise<UserUsage> {
  await delay(200);
  usage = { ...usage, creditsRemaining: usage.creditsRemaining - amount, creditsUsedTotal: usage.creditsUsedTotal + amount };
  return { ...usage };
}

export async function purchaseCredits(userId: string, packId: string): Promise<UserUsage> {
  await delay(500);
  const pack = creditPacks.find(p => p.id === packId);
  if (!pack) throw new Error('Pack not found');
  usage = { ...usage, creditsRemaining: usage.creditsRemaining + pack.credits };
  return { ...usage };
}

// ─── Keep Alive ─────────────────────────────────────────────────────────
export async function keepAlive(): Promise<KeepAliveResponse> {
  await delay(100);
  return { status: 'ok', serverTime: new Date().toISOString() };
}

// ─── History ────────────────────────────────────────────────────────────
const historyEntries: HistoryEntry[] = [
  { id: 'h-1', type: 'transcription', title: 'Chào hỏi tiếng Nhật - あいさつ', description: 'Phiên dịch video YouTube', timestamp: '2026-04-02T09:00:00Z', metadata: { videoUrl: 'https://youtube.com/watch?v=abc123' } },
  { id: 'h-2', type: 'flashcard', title: 'Ôn 15 từ vựng', description: 'Ôn tập chủ đề Danh từ', timestamp: '2026-04-02T10:00:00Z', metadata: { topicId: 'topic-noun' } },
  { id: 'h-3', type: 'manga', title: 'Đọc One Piece Ch. 1', description: 'Đọc manga với OCR', timestamp: '2026-04-01T15:00:00Z', metadata: { mangaId: 'manga-1' } },
  { id: 'h-5', type: 'grammar', title: 'Ôn ngữ pháp cơ bản', description: '8 mẫu ngữ pháp', timestamp: '2026-03-31T11:00:00Z', metadata: {} },
];

export async function getHistory(userId: string, type: string): Promise<HistoryEntry[]> {
  await delay(300);
  if (type === 'all') return [...historyEntries];
  return historyEntries.filter(h => h.type === type);
}
