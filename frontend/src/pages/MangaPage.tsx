import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Loader2, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  searchManga,
  getMangaMainPage,
  clearMangaMainPageCache,
  type MangaInfo,
} from '@/lib/api/manga-real';

const QUERY_STORAGE_KEY = 'manga-query';
const MODE_STORAGE_KEY = 'manga-mode';
const PAGE_STORAGE_KEY = 'manga-page';
const RESULTS_STORAGE_KEY = 'manga-results';

type Mode = 'mainpage' | 'search';

export default function MangaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate from URL ?q= first, else sessionStorage
  const initialQuery =
    searchParams.get('q') ?? sessionStorage.getItem(QUERY_STORAGE_KEY) ?? '';
  const initialPage = Number(
    searchParams.get('page') ?? sessionStorage.getItem(PAGE_STORAGE_KEY) ?? '1',
  );
  const initialMode: Mode =
    (searchParams.get('mode') as Mode) ??
    ((sessionStorage.getItem(MODE_STORAGE_KEY) as Mode) ||
      (initialQuery ? 'search' : 'mainpage'));

  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [page, setPage] = useState<number>(initialPage || 1);
  const [results, setResults] = useState<MangaInfo[]>(() => {
    try {
      const cached = sessionStorage.getItem(RESULTS_STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Persist state
  useEffect(() => {
    sessionStorage.setItem(QUERY_STORAGE_KEY, query);
  }, [query]);
  useEffect(() => {
    sessionStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);
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

  const runMainPage = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      const res = await getMangaMainPage(p);
      setResults(res.items);
      setHasMore(res.hasMore);
      setTotalPages(res.totalPages);
      setMode('mainpage');
      setPage(res.page);
    } catch {
      toast.error('Không thể tải trang chính manga.');
    } finally {
      setLoading(false);
    }
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const items = await searchManga(q);
      setResults(items);
      setHasMore(false);
      setTotalPages(1);
      setMode('search');
      setPage(1);
      if (items.length === 0) toast.info('Không tìm thấy manga nào.');
    } catch {
      toast.error('Không thể tìm kiếm manga.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (results.length > 0) return; // keep cached on mount
    if (mode === 'search' && query.trim()) {
      runSearch(query.trim());
    } else {
      runMainPage(page || 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query.trim(), mode: 'search' }, { replace: true });
    runSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    setSearchParams({}, { replace: true });
    runMainPage(1);
  };

  const handleReloadMainpage = () => {
    clearMangaMainPageCache();
    runMainPage(1);
  };

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setSearchParams({ mode: 'mainpage', page: String(next) }, { replace: true });
    runMainPage(next);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-2">Manga</h2>
        <p className="text-sm text-muted-foreground">
          Tìm và đọc manga để ôn tập tiếng Nhật với OCR
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Tìm kiếm manga..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              disabled={loading}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                aria-label="Xoá"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Đang tìm...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Tìm kiếm
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={loading}
            title="Xoá hết và trở về trang chính"
          >
            <X className="w-4 h-4 mr-1" />
            Xoá hết
          </Button>
        </div>
      </form>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {mode === 'mainpage' ? (
            <>
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Trang chính</h3>
              <span className="text-xs text-muted-foreground">(Trang {page} / {totalPages})</span>
            </>
          ) : (
            <h3 className="text-base font-semibold text-foreground">
              Kết quả cho “{query}” ({results.length})
            </h3>
          )}
        </div>
        {mode === 'mainpage' && (
          <Button variant="ghost" size="sm" onClick={handleReloadMainpage} disabled={loading}>
            Tải lại
          </Button>
        )}
      </div>

      {/* Results Grid */}
      {loading && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Đang tải...</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((manga, idx) => (
              <Card
                key={`${manga.manga_url}-${idx}`}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() =>
                  navigate(`/manga/${encodeURIComponent(manga.manga_url.replace(/^\/manga\//, ''))}`)
                }
              >
                <div className="aspect-[3/4] bg-muted overflow-hidden">
                  <img
                    src={manga.cover_url}
                    alt={manga.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm line-clamp-2">{manga.name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          {mode === 'mainpage' && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? 'default' : 'outline'}
                  className="h-8 min-w-[32px]"
                  onClick={() => goToPage(p)}
                  disabled={loading}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore || loading}
                onClick={() => goToPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Không tìm thấy manga nào. Thử từ khoá khác.</p>
        </div>
      )}
    </div>
  );
}
