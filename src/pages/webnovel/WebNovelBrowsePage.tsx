import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Clock3, Loader2, Search, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getNovel, getWebNovelHistory, searchNovels, deleteWebNovelHistory, type WebNovelReadHistoryResponse, type WebNovelResponse } from '@/lib/api/webnovel';
import { toast } from 'sonner';

function novelLabel(novel: WebNovelResponse, fallback: string) {
  return novel.chapters?.[0]?.name || fallback;
}

export default function WebNovelBrowsePage() {
  const { t } = useTranslation('webnovel');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [results, setResults] = useState<WebNovelResponse[]>([]);
  const [history, setHistory] = useState<Array<{ record: WebNovelReadHistoryResponse; novel: WebNovelResponse }>>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'history'>('browse');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const records = await getWebNovelHistory();
      const entries = await Promise.all(records.map(async (record) => {
        try {
          return { record, novel: await getNovel(record.web_novel_id) };
        } catch {
          return null;
        }
      }));
      setHistory(entries.filter((entry): entry is { record: WebNovelReadHistoryResponse; novel: WebNovelResponse } => entry !== null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('history.loadFailed'));
    } finally {
      setHistoryLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setParams({ q: value }, { replace: true });
    try {
      setResults(await searchNovels({ q: value, limit: 30 }));
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : t('browse.searchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const removeHistory = async (novelId: string) => {
    try {
      await deleteWebNovelHistory(novelId);
      setHistory((items) => items.filter(({ record }) => record.web_novel_id !== novelId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('history.deleteFailed'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in p-4 md:p-6" data-testid="webnovel-browse-page">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('page.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('page.subtitle')}</p>
      </header>

      <div className="mb-6 flex gap-2 border-b">
        <button type="button" className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === 'browse' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('browse')}>
          <span className="flex items-center gap-1.5"><Search className="h-4 w-4" />{t('page.tabs.browse')}</span>
        </button>
        <button type="button" className={`border-b-2 px-3 py-2 text-sm font-medium ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('history')}>
          <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{t('page.tabs.history')}</span>
        </button>
      </div>

      {activeTab === 'browse' ? (
        <>
          <form onSubmit={submit} className="mb-6 flex gap-2">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('browse.searchPlaceholder')} className="max-w-xl" data-testid="webnovel-search-input" />
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {loading ? tc('actions.searching') : tc('actions.search')}
            </Button>
          </form>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {!loading && results.length === 0 && !error && (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              <BookOpen className="mx-auto mb-3 h-8 w-8 opacity-40" />{t('browse.empty')}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {results.map((novel) => (
              <Card key={novel.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/webnovel/${encodeURIComponent(novel.id)}`)} data-testid={`webnovel-result-${novel.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-start justify-between gap-3 text-base">
                    <span className="line-clamp-2">{novelLabel(novel, t('browse.untitled'))}</span>
                    <Badge variant="outline" className="shrink-0">{t('browse.chapterCount', { count: novel.chapters?.length ?? 0 })}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{t('browse.author', { author: novel.author })}</p>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{novel.summary || t('browse.noSummary')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t('history.title')}</h2>
            <Button variant="ghost" size="sm" onClick={() => void loadHistory()} disabled={historyLoading}>{historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tc('actions.refresh')}</Button>
          </div>
          {historyLoading && history.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{tc('states.loading')}</div>
          ) : history.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{t('history.empty')}</div>
          ) : (
            <div className="space-y-2">
              {history.map(({ record, novel }) => (
                <div key={record.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <button type="button" className="min-w-0 flex-1 text-left hover:text-primary" onClick={() => navigate(`/webnovel/${encodeURIComponent(record.web_novel_id)}/read/${encodeURIComponent(record.chapter_id)}`)}>
                    <span className="block truncate font-medium">{novelLabel(novel, t('browse.untitled'))}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{t('browse.author', { author: novel.author })} · {new Date(record.updated_at).toLocaleString()}</span>
                  </button>
                  <Button variant="ghost" size="icon" aria-label={t('history.delete')} onClick={() => void removeHistory(record.web_novel_id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
