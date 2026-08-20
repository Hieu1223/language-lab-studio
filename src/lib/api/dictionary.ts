// Tokenization + dictionary lookup endpoints
// Matches: /tokenization/* routes from OpenAPI spec
import { apiCall } from './client';
import type { components } from './types.gen';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Token = components['schemas']['Token'];
export type TokenList = components['schemas']['TokenList'];
export type DependencyTree = components['schemas']['DependencyTree'];
export type DependencyLink = components['schemas']['DependencyLink'];
export type WordLookupEntry = components['schemas']['WordLookupEntry'];
export type WordLookupResponse = components['schemas']['WordLookupResponse'];
export type SaveTokenizationResponse = components['schemas']['SaveTokenizationResponse'];
export type TokenizationHistoryItem = components['schemas']['TokenizationHistoryItem'];
export type TokenizationHistoryListResponse = components['schemas']['TokenizationHistoryListResponse'];

// ─── Tokenization ───────────────────────────────────────────────────────────

/** GET /tokenization/tokenize — Tokenize text into morphemes + dependency trees */
export async function tokenize(text: string, signal?: AbortSignal): Promise<TokenList> {
  return apiCall<TokenList>('/tokenization/tokenize', {
    query: { text },
    signal,
  });
}

/** POST /tokenization/tokenize/save — Tokenize and save to user's history */
export async function saveTokenization(text: string): Promise<SaveTokenizationResponse> {
  return apiCall<SaveTokenizationResponse>('/tokenization/tokenize/save', {
    method: 'POST',
    body: { text } as components['schemas']['SaveTokenizationRequest'],
  });
}

/** GET /tokenization/tokenize/history — Get user's saved tokenization history */
export async function getTokenizationHistory(
  offset = 0,
  limit = 50,
): Promise<TokenizationHistoryListResponse> {
  return apiCall<TokenizationHistoryListResponse>('/tokenization/tokenize/history', {
    query: { offset, limit },
  });
}

/** DELETE /tokenization/tokenize/history/{history_id} — Delete a history entry */
export async function deleteTokenizationHistory(historyId: string): Promise<void> {
  await apiCall<void>(`/tokenization/tokenize/history/${encodeURIComponent(historyId)}`, {
    method: 'DELETE',
  });
}

// ─── Dictionary Lookup ──────────────────────────────────────────────────────

/** GET /tokenization/dictionary/words/lookup — Search dictionary by word/reading */
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

/** Get the best query string for looking a token up in the dictionary */
export function lookupQueryFor(token: Token): string {
  return token.dictionary_form || token.normalized || token.surface;
}

/** Check if a token is worth looking up (excludes punctuation/whitespace) */
export function isLookupCandidate(token: Token): boolean {
  const text = token.surface.trim();
  if (!text) return false;
  const pos = token.pos?.[0] ?? '';
  return !/^(補助記号 | 空白 | 記号)/.test(pos);
}

/** Convert a DependencyLink to Token shape for reuse with TokenPopover */
export function depLinkToToken(link: DependencyLink, sentenceId = 0): Token {
  return {
    sentence_id: sentenceId,
    surface: link.surface,
    normalized: link.lemma,
    dictionary_form: link.lemma,
    reading: link.reading ?? null,
    pos: link.pos,
    word_id: link.token_index,
    begin: link.token_index,
    end: link.token_index + link.surface.length,
    dep: link.dep,
    dep_description: link.dep_description,
    head_index: link.head_index ?? null,
    head_surface: link.head_surface ?? null,
  };
}
