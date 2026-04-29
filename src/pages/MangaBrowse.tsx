import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Loader2, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  searchManga,
  type MangaInfo,
} from '@/lib/api/manga';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const QUERY_STORAGE_KEY = 'manga-query';
const PAGE_STORAGE_KEY = 'manga-page';
const SORT_STORAGE_KEY = 'manga-sort';
const RESULTS_STORAGE_KEY = 'manga-results';

const DEFAULT_QUERY = '%20';

export default function MangaBrowse() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate from URL or sessionStorage
  const initialQuery =
    searchParams.get('q') ?? sessionStorage.getItem(QUERY_STORAGE_KEY) ?? DEFAULT_QUERY;
  const initialPage = Number(
    searchParams.get('page') ?? sessionStorage.getItem(PAGE_STORAGE_KEY) ?? '1',
  );
  const initialSort =
    searchParams.get('sort') ?? sessionStorage.getItem(SORT_STORAGE_KEY) ?? 'recently_updated';

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState<number>(initialPage || 1);
  const [sort, setSort] = useState<string>(initialSort);
  const [results, setResults] = useState<MangaInfo[]>(() => {
    try {
      const cached = sessionStorage.getItem(RESULTS_STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
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
    sessionStorage.setItem(SORT_STORAGE_KEY, sort);
  }, [sort]);
  useEffect(() => {
    try {
      sessionStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results));
    } catch {
      // too big; ignore
    }
  }, [results]);

  const runSearch = useCallback(async (q: string, p: number = 1, s: string = 'recently_updated') => {
    setLoading(true);
    try {
      const items = await searchManga(q, p, s);
      setResults(items);
      setPage(p);
      setSort(s);
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
    runSearch(query || DEFAULT_QUERY, page, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim() || DEFAULT_QUERY;
    setSearchParams({ q, page: '1', sort }, { replace: true });
    runSearch(q, 1, sort);
  };

  const handleClear = () => {
    setQuery(DEFAULT_QUERY);
    setSearchParams({ q: DEFAULT_QUERY, page: '1', sort }, { replace: true });
    runSearch(DEFAULT_QUERY, 1, sort);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setSearchParams({ q: query, page: '1', sort: newSort }, { replace: true });
    runSearch(query, 1, newSort);
  };

  const goToPage = (p: number) => {
    setSearchParams({ q: query, page: String(p), sort }, { replace: true });
    runSearch(query, p, sort);
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
              placeholder="Tìm kiếm manga..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              disabled={loading}
            />
            {query && query !== DEFAULT_QUERY && (
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
          <Select value={sort} onValueChange={handleSortChange} disabled={loading}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recently_updated">Mới cập nhật</SelectItem>
              <SelectItem value="most_viewed">Xem nhiều</SelectItem>
              <SelectItem value="scores">Điểm cao</SelectItem>
              <SelectItem value="title_az">Tên A-Z</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={loading}>
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
        </div>
      </form>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            {query === DEFAULT_QUERY ? 'Đề xuất cho bạn' : `"${query}"`} ({results.length})
          </h3>
        </div>
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

          {/* Pagination */}
          {results.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" /> Trước
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Trang {page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || results.length < 20}
                onClick={() => goToPage(page + 1)}
              >
                Sau <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Không tìm thấy manga nào. Thử từ khoá khác.</p>
        </div>
      )}
    </>
  );
}
