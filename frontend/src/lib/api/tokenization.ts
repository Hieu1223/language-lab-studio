import { apiCall } from '../api-client';

// ─── Types ─────────────────────────────────────────────────────────────────

/** A dictionary entry — `id` is uuid4. NEVER use `Token.word_id` integer for save-to-deck. */
export interface WordEntry {
  id: string; // uuid4
  word: string;
  reading: string;
  meaning: string;
}

export interface Token {
  sentence_id: number;
  surface: string;
  normalized: string;
  dictionary_form: string;
  reading?: string | null;
  pos: string[];
  /** integer; NOT a uuid. Do not use for AddCardRequest.word_id. */
  word_id: number;
  begin: number;
  end: number;
  /** Dictionary entry; `entry.id` is the uuid4 to use for AddCardRequest.word_id. */
  entry: WordEntry | null;
}

export interface TokenList {
  tokens: Token[];
}

export interface KanjiResponse {
  id: string; // uuid4
  kanji: string;
  reading?: string | null;
  strokes?: number | null;
  radical?: string | null;
  unicode?: string | null;
  shape?: string | null;
  meanings?: string | null;
  words: WordEntry[]; // each word has uuid4 id
}

// ─── API ───────────────────────────────────────────────────────────────────

/** Tokenize a Japanese sentence. Returns word-level tokens with optional dictionary entries. */
export async function tokenize(text: string): Promise<TokenList> {
  return apiCall<TokenList>('/tokenization/tokenize', {
    method: 'GET',
    query: { text },
  });
}

/** Look up a single kanji and its known words. */
export async function getKanji(kanji: string): Promise<KanjiResponse> {
  return apiCall<KanjiResponse>(`/tokenization/kanji/${encodeURIComponent(kanji)}`, {
    method: 'GET',
  });
}

/** Search kanji by Vietnamese romanized reading. */
export async function searchKanji(reading: string, limit: number = 20): Promise<KanjiResponse[]> {
  return apiCall<KanjiResponse[]>('/tokenization/kanji', {
    method: 'GET',
    query: { reading, limit },
  });
}
