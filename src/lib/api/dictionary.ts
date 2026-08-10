// Tokenization + dictionary lookup (doc §5.6).
//
// IMPORTANT contract note: the API's `Token` carries NO embedded dictionary
// entry. Tokenizing gives you surface/reading/dictionary_form only; getting a
// definition requires a second explicit call to `lookupWord`. Any code that
// expects `token.entry` is working against an older, non-existent API shape.
import { apiCall } from './client';
import type { components } from './types.gen';

export type Token = components['schemas']['Token'];
export type TokenList = components['schemas']['TokenList'];
export type WordLookupEntry = components['schemas']['WordLookupEntry'];
export type WordLookupResponse = components['schemas']['WordLookupResponse'];

export interface DependencyLink {
  token_index: number;
  surface: string;
  reading: string | null;
  lemma: string;
  pos: string[];
  dep: string;
  dep_description: string;
  head_index: number | null;
  head_surface: string | null;
  is_root: boolean;
}

export interface DependencyTreeResponse {
  text: string;
  sentences: Array<{
    sentence_id: number;
    text: string;
    tokens: DependencyLink[];
  }>;
}

/** GET /tokenization/tokenize — explicit submit only, never per keystroke. */
export async function tokenize(text: string, signal?: AbortSignal): Promise<TokenList> {
  return apiCall<TokenList>('/tokenization/tokenize', {
    query: { text },
    signal,
  });
}

/** GET /tokenization/dependency-tree */
export async function getDependencyTree(
  text: string,
  signal?: AbortSignal,
): Promise<DependencyTreeResponse> {
  return apiCall<DependencyTreeResponse>('/tokenization/dependency-tree', {
    query: { text },
    signal,
  });
}

/** GET /tokenization/dictionary/words/lookup */
export async function lookupWord(
  q: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<WordLookupResponse> {
  return apiCall<WordLookupResponse>('/tokenization/dictionary/words/lookup', {
    query: { q, limit },
    signal,
  });
}

/**
 * The best query string for looking a token up: prefer its dictionary form,
 * falling back through normalized to the raw surface.
 */
export function lookupQueryFor(token: Token): string {
  return token.dictionary_form || token.normalized || token.surface;
}

/** Tokens that are punctuation/whitespace aren't worth a dictionary lookup. */
export function isLookupCandidate(token: Token): boolean {
  const text = token.surface.trim();
  if (!text) return false;
  const pos = token.pos?.[0] ?? '';
  return !/^(補助記号|空白|記号)/.test(pos);
}
