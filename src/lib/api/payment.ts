import type { UserUsage, PricingPlan } from './types';
import { mockPricingPlans, mockUserUsage } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let usage = { ...mockUserUsage };

export async function getUserUsage(): Promise<UserUsage> {
  await delay(200);
  return { ...usage };
}

export async function getPricingPlans(): Promise<PricingPlan[]> {
  await delay(200);
  return [...mockPricingPlans];
}

export async function canTranscribe(): Promise<boolean> {
  await delay(100);
  if (usage.isPaid && usage.transcriptionsLimit === -1) return true;
  return usage.transcriptionsUsed < usage.transcriptionsLimit;
}

export async function incrementUsage(): Promise<UserUsage> {
  await delay(100);
  usage = { ...usage, transcriptionsUsed: usage.transcriptionsUsed + 1 };
  return { ...usage };
}

export async function subscribeToPlan(planId: string): Promise<UserUsage> {
  await delay(1000);
  const plan = mockPricingPlans.find(p => p.id === planId);
  if (!plan) throw new Error('Plan not found');
  usage = {
    transcriptionsUsed: 0,
    transcriptionsLimit: plan.transcriptionsPerMonth,
    isPaid: plan.price > 0,
    plan: planId as UserUsage['plan'],
  };
  return { ...usage };
}
