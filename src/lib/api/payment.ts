import type { UserUsage, CreditPack } from './types';
import { mockCreditPacks, mockUserUsage } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let usage = { ...mockUserUsage };

export async function getUserUsage(): Promise<UserUsage> {
  await delay(200);
  return { ...usage };
}

export async function getCreditPacks(): Promise<CreditPack[]> {
  await delay(200);
  return [...mockCreditPacks];
}

export async function canSpendCredits(amount: number = 1): Promise<boolean> {
  await delay(100);
  return usage.creditsRemaining >= amount;
}

export async function spendCredits(amount: number = 1): Promise<UserUsage> {
  await delay(100);
  if (usage.creditsRemaining >= amount) {
    usage = { ...usage, creditsRemaining: usage.creditsRemaining - amount, creditsUsedTotal: usage.creditsUsedTotal + amount };
  }
  return { ...usage };
}

export async function buyCredits(packId: string): Promise<UserUsage> {
  await delay(1000);
  const pack = mockCreditPacks.find(p => p.id === packId);
  if (!pack) throw new Error('Pack not found');
  usage = { ...usage, creditsRemaining: usage.creditsRemaining + pack.credits };
  return { ...usage };
}
