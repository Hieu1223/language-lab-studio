import type { TokenizedResult } from './types';
import { mockTokenize } from './mock-data';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function tokenizeText(text: string): Promise<TokenizedResult> {
  await delay(500);
  return { original: text, tokens: mockTokenize(text) };
}
