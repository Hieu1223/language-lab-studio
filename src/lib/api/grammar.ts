import { apiCall } from './client';
import type { components } from './types.gen';

export type GrammarSummary = components['schemas']['GrammarSummary'];
export type GrammarEntry = components['schemas']['GrammarEntry'];
export type GrammarLookupResponse = components['schemas']['GrammarLookupResponse'];
export type GrammarDetailResponse = components['schemas']['GrammarDetailResponse'];

/** GET /grammar/lookup — search grammar points by keyword. */
export async function lookupGrammar(
  q: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<GrammarLookupResponse> {
  return apiCall<GrammarLookupResponse>('/grammar/lookup', {
    query: { q, limit },
    signal,
  });
}

/** GET /grammar/detail — fetch the full entry for a grammar result. */
export async function getGrammarDetail(
  id: number,
  signal?: AbortSignal,
): Promise<GrammarDetailResponse> {
  return apiCall<GrammarDetailResponse>('/grammar/detail', {
    query: { id },
    signal,
  });
}
