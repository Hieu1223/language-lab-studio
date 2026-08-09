import { useCallback, useEffect, useRef, useState } from 'react';
import { lookupWord, type WordLookupEntry } from '@/lib/api/dictionary';
import { ApiError } from '@/lib/api/client';

export interface LookupState {
  query: string;
  loading: boolean;
  error: string | null;
  results: WordLookupEntry[];
  /** Convenience: exactly one result renders inline, many render as a list. */
  single: WordLookupEntry | null;
}

const EMPTY: LookupState = {
  query: '',
  loading: false,
  error: null,
  results: [],
  single: null,
};

/**
 * Shared dictionary-lookup hook (doc §5.6).
 *
 * The API's tokenizer returns NO embedded dictionary entry, so a definition is
 * always a second, explicit call to `/tokenization/dictionary/words/lookup`.
 * This hook is the single implementation reused by the dictionary page, the
 * transcription view, and the manga reader.
 *
 * In-flight requests are aborted when a new lookup starts, so rapid clicking
 * through tokens can't render a stale result.
 */
export function useLookup(limit = 20) {
  const [state, setState] = useState<LookupState>(EMPTY);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const lookup = useCallback(
    async (query: string): Promise<WordLookupEntry[]> => {
      const q = query.trim();
      controller.current?.abort();

      if (!q) {
        setState(EMPTY);
        return [];
      }

      const ctrl = new AbortController();
      controller.current = ctrl;
      setState({ query: q, loading: true, error: null, results: [], single: null });

      try {
        const res = await lookupWord(q, limit, ctrl.signal);
        if (!mounted.current || ctrl.signal.aborted) return [];
        const results = res.results ?? [];
        setState({
          query: q,
          loading: false,
          error: null,
          results,
          single: results.length === 1 ? results[0] : null,
        });
        return results;
      } catch (err) {
        if (ctrl.signal.aborted || !mounted.current) return [];
        // A 404 means "no entry", which is an empty state, not an error.
        if (err instanceof ApiError && err.status === 404) {
          setState({ query: q, loading: false, error: null, results: [], single: null });
          return [];
        }
        setState({
          query: q,
          loading: false,
          error: err instanceof Error ? err.message : 'Tra cứu thất bại',
          results: [],
          single: null,
        });
        return [];
      }
    },
    [limit],
  );

  const clear = useCallback(() => {
    controller.current?.abort();
    setState(EMPTY);
  }, []);

  return { ...state, lookup, clear };
}
