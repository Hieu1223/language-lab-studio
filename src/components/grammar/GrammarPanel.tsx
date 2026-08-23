import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, BookOpen, Loader2, Search, Sparkles } from 'lucide-react';

import { getGrammarDetail, lookupGrammar, type GrammarEntry, type GrammarSummary } from '@/lib/api/grammar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface GrammarPanelProps {
  className?: string;
}

export function GrammarPanel({ className = '' }: GrammarPanelProps) {
  const { t } = useTranslation('grammar');
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<GrammarSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, GrammarEntry>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    searchAbortRef.current?.abort();
    detailAbortRef.current?.abort();
  }, []);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const value = query.trim();
    if (!value) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setLoading(true);
    setSearched(true);
    setError(null);
    setExpandedId(null);
    setDetailError(null);

    try {
      const response = await lookupGrammar(value, 30, controller.signal);
      if (!controller.signal.aborted) setResults(response.results ?? []);
    } catch (err) {
      if (!controller.signal.aborted) {
        setResults([]);
        setError(err instanceof Error ? err.message : t('errors.searchFailed'));
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const toggleDetail = async (summary: GrammarSummary) => {
    if (expandedId === summary.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(summary.id);
    setDetailError(null);
    if (details[summary.id]) return;

    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    setDetailLoadingId(summary.id);
    try {
      const response = await getGrammarDetail(summary.id, controller.signal);
      if (!controller.signal.aborted) {
        setDetails((previous) => ({ ...previous, [summary.id]: response.entry }));
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setDetailError(err instanceof Error ? err.message : t('errors.detailFailed'));
      }
    } finally {
      if (!controller.signal.aborted) setDetailLoadingId(null);
    }
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`} data-testid="grammar-panel">
      <div className="border-b border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">{t('panel.title')}</h2>
            <p className="text-[11px] text-muted-foreground">{t('panel.subtitle')}</p>
          </div>
        </div>
        <form onSubmit={submit} className="flex gap-1.5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('panel.searchPlaceholder')}
            className="h-8 text-xs"
            data-testid="grammar-search-input"
          />
          <Button type="submit" size="icon" className="h-8 w-8" disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
        </form>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!searched && !loading && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Sparkles className="h-6 w-6 opacity-40" />
              <p className="text-xs leading-snug">{t('panel.hint')}</p>
            </div>
          )}
          {searched && !loading && !error && results.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">{t('panel.notFound')}</p>
          )}

          {results.map((summary) => {
            const expanded = expandedId === summary.id;
            const detail = details[summary.id];
            return (
              <div key={summary.id} className="overflow-hidden rounded-md border bg-card">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 p-2.5 text-left transition-colors hover:bg-muted/40"
                  onClick={() => void toggleDetail(summary)}
                  aria-expanded={expanded}
                  data-testid={`grammar-result-${summary.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-japanese text-base font-bold leading-tight">{summary.keyword}</p>
                    <p className="font-japanese text-[11px] text-muted-foreground">{summary.jp}</p>
                    <p className="mt-1 text-[11px] leading-snug">{summary.imi_setsumei}</p>
                  </div>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>

                {expanded && (
                  <div className="border-t px-2.5 pb-3 pt-2 text-xs">
                    {detailLoadingId === summary.id && (
                      <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('detail.loading')}</div>
                    )}
                    {detailError && <p className="text-destructive">{detailError}</p>}
                    {detail && (
                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 font-semibold text-foreground">{t('detail.meaning')}</p>
                          <p className="leading-relaxed">{detail.imi_setsumei}</p>
                        </div>
                        <div>
                          <p className="mb-1 font-semibold text-foreground">{t('detail.usage')}</p>
                          <p className="whitespace-pre-line leading-relaxed">{detail.tsukaikata_setsumei}</p>
                        </div>
                        {detail.reibun.length > 0 && (
                          <div>
                            <p className="mb-1 font-semibold text-foreground">{t('detail.examples')}</p>
                            <div className="space-y-2">
                              {detail.reibun.map((example, index) => (
                                <div key={`${example.ja}-${index}`} className="rounded border bg-muted/30 p-2">
                                  <p className="font-japanese leading-relaxed">{example.ja}</p>
                                  {example.romaji && <p className="mt-0.5 text-[10px] text-muted-foreground">{example.romaji}</p>}
                                  <p className="mt-0.5 leading-relaxed">{example.vn}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default GrammarPanel;
