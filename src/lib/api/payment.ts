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

export async function canSpendCredits(amount: number = 1): Promise<boolean> {
  await delay(100);
  return usage.creditsRemaining >= amount;
}

export async function spendCredits(amount: number = 1): Promise<UserUsage> {
  await delay(100);
  if (usage.creditsRemaining >= amount) {
    usage = { ...usage, creditsRemaining: usage.creditsRemaining - amount, creditsUsedToday: usage.creditsUsedToday + amount };
  } else {
    // overage
    const overage = amount - usage.creditsRemaining;
    usage = { ...usage, creditsRemaining: 0, creditsUsedToday: usage.creditsUsedToday + amount, overageCreditsUsed: usage.overageCreditsUsed + overage };
  }
  return { ...usage };
}

export async function refuelCredits(): Promise<UserUsage> {
  await delay(200);
  usage = { ...usage, creditsRemaining: usage.dailyCredits, creditsUsedToday: 0, lastRefuel: new Date().toISOString() };
  return { ...usage };
}

export async function subscribeToPlan(planId: string): Promise<UserUsage> {
  await delay(1000);
  const plan = mockPricingPlans.find(p => p.id === planId);
  if (!plan) throw new Error('Plan not found');
  usage = {
    creditsRemaining: plan.dailyCredits,
    dailyCredits: plan.dailyCredits,
    creditsUsedToday: 0,
    overageCreditsUsed: 0,
    plan: planId as UserUsage['plan'],
    lastRefuel: new Date().toISOString(),
  };
  return { ...usage };
}
