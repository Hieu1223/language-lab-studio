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

export type DependencyLink = components['schemas']['DependencyLink'];
export type DependencyTree = components['schemas']['DependencyTree'];
export type DependencyTreeResponse = components['schemas']['DependencyTreeResponse'];
export type TokenizeDependenciesResponse = components['schemas']['TokenizeDependenciesResponse'];

/**
 * Adapt a GiNZA dependency token to the tokenizer's `Token` shape so it can be
 * reused with `TokenPopover` / dictionary lookup helpers.
 */
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
