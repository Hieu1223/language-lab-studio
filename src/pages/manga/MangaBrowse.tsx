import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Loader2, X, Sparkles, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { MangaImage } from '@/components/manga/MangaImage';
import { searchManga, type MangaPreview } from '@/lib/api/manga';

// ─── Storage keys ─────────────────────────────────────────────────────────
const QUERY_STORAGE_KEY = 'manga-query';
const PAGE_STORAGE_KEY = 'manga-page';
const RESULTS_STORAGE_KEY = 'manga-results';

// ─── Constants ────────────────────────────────────────────────────────────
/**
 * Default query for the `/manga/manga` endpoint. Per backend contract, the
 * default query is the **empty string** (`''`) — not `null`, not a sentinel
 * like `%20`. The server treats it as "show everything".
 */
const DEFAULT_QUERY = '';
const PAGE_SIZE = 20;

export default function MangaBrowse() {
  const navigate = useNavigate();
  const { t } = useTranslation('manga');
  const { t: tc } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate from URL or sessionStorage
  const initialQuery =
    searchParams.get('q') ?? sessionStorage.getItem(QUERY_STORAGE_KEY) ?? DEFAULT_QUERY;
  const initialPage = Math.max(
    1,
    Number(searchParams.get('page') ?? sessionStorage.getItem(PAGE_STORAGE_KEY) ?? '1') || 1,
  );

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState<number>(initialPage);
  const [results, setResults] = useState<MangaPreview[]>(() => {
    try {
      const cached = sessionStorage.getItem(RESULTS_STORAGE_KEY);
      return cached ? (JSON.parse(cached) as MangaPreview[]) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  // Persist state
  useEffect(() => {
    sessionStorage.setItem(QUERY_STORAGE_KEY, query);
  }, [query]);
  useEffect(() => {
    sessionStorage.setItem(PAGE_STORAGE_KEY, String(page));
  }, [page]);
  useEffect(() => {
    try {
      sessionStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results));
    } catch {
      // too big; ignore
    }
  }, [results]);

  /**
   * Run a server-side search. We always send `q` as a string (possibly empty)
   * together with `limit` + `offset` — this matches the backend spec.
   */
  const runSearch = useCallback(async (q: string, p: number = 1) => {
    setLoading(true);
    try {
      const items = await searchManga({
        q,
        limit: PAGE_SIZE,
        offset: Math.max(0, (p - 1) * PAGE_SIZE),
      });
      setResults(items);
      setPage(p);
      if (items.length === 0) toast.info(t('browse.noResults'));
    } catch {
      toast.error(t('browse.searchFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    if (results.length > 0) return; // keep cached on mount
    runSearch(query, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setQuery(q); // reflect trimmed value back to input
    setSearchParams({ q, page: '1' }, { replace: true });
    runSearch(q, 1);
  };

  const handleClear = () => {
    setQuery(DEFAULT_QUERY);
    setSearchParams({ q: DEFAULT_QUERY, page: '1' }, { replace: true });
    runSearch(DEFAULT_QUERY, 1);
  };

  const goToPage = (p: number) => {
    setSearchParams({ q: query, page: String(p) }, { replace: true });
    runSearch(query, p);
  };

  return (
    <>
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={t('browse.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              disabled={loading}
              data-testid="manga-search-input"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                aria-label={t('browse.clear')}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {tc('actions.searching')}
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                {tc('actions.search')}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            {query === DEFAULT_QUERY ? t('browse.suggested') : t('browse.queryHeading', { query })} ({results.length})
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('browse.pageInfo', { page, size: PAGE_SIZE })}
        </p>
      </div>

      {/* Results Grid */}
      {loading && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">{tc('states.loadingShort')}</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((manga) => (
              <Card
                key={manga.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/manga/${encodeURIComponent(manga.id)}`)}
                data-testid={`manga-card-${manga.id}`}
              >
                <div className="aspect-[3/4] bg-muted overflow-hidden relative">
                  {manga.cover ? (
                    <MangaImage
                      src={manga.cover}
                      alt={manga.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <BookOpen className="w-10 h-10 opacity-30" />
                    </div>
                  )}
                  {manga.status && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-[10px] h-5 px-1.5 capitalize"
                    >
                      {manga.status}
                    </Badge>
                  )}
                </div>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm line-clamp-2">{manga.title}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              data-testid="manga-prev-page"
            >
              <ChevronLeft className="w-4 h-4" /> {tc('actions.prev')}
            </Button>
            <span className="text-sm text-muted-foreground px-3">{t('browse.pageLabel', { page })}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || results.length < PAGE_SIZE}
              onClick={() => goToPage(page + 1)}
              data-testid="manga-next-page"
            >
              {tc('actions.next')} <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t('browse.empty')}</p>
        </div>
      )}
    </>
  );
}
