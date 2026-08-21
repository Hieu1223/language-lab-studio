import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Loader2, X, Sparkles, ChevronLeft, ChevronRight, BookOpen, Filter, Tag, UserRound } from 'lucide-react';
import { MangaImage } from '@/components/manga/MangaImage';
import { searchManga, searchMangaGenres, searchMangaCreators, type MangaOrder, type MangaOrderDirection, type MangaPreview, type CreatorPreview } from '@/lib/api/manga';

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
  const [selectedTags, setSelectedTags] = useState(() => searchParams.getAll('genres'));
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<{ slug: string; name: string }[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [authorInput, setAuthorInput] = useState('');
  const [author, setAuthor] = useState<CreatorPreview | null>(null);
  const [authorSuggestions, setAuthorSuggestions] = useState<CreatorPreview[]>([]);
  const [authorLoading, setAuthorLoading] = useState(false);
  const [orderBy, setOrderBy] = useState<MangaOrder | ''>(
    (searchParams.get('order_by') as MangaOrder | null) ?? '',
  );
  const [orderDir, setOrderDir] = useState<MangaOrderDirection>((searchParams.get('order_dir') as MangaOrderDirection | null) ?? 'desc');
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
  const runSearch = useCallback(async (
    q: string,
    genres: string[],
    creator: CreatorPreview | null,
    sort: MangaOrder | '',
    direction: MangaOrderDirection,
    p: number = 1,
  ) => {
    setLoading(true);
    try {
      const items = await searchManga({
        q,
        genres,
        author: creator?.id ? String(creator.id) : null,
        order_by: sort || null,
        order_dir: direction,
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

  useEffect(() => {
    const prefix = tagInput.trim();
    if (!prefix) {
      setTagSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setTagsLoading(true);
      try {
        const suggestions = await searchMangaGenres(prefix, 5);
        if (!cancelled) setTagSuggestions(suggestions.filter((tag) => !selectedTags.includes(tag.slug)));
      } catch {
        if (!cancelled) setTagSuggestions([]);
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tagInput, selectedTags]);

  useEffect(() => {
    const prefix = authorInput.trim();
    if (!prefix) { setAuthorSuggestions([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setAuthorLoading(true);
      try {
        const suggestions = await searchMangaCreators(prefix, 5);
        if (!cancelled) setAuthorSuggestions(suggestions);
      } catch {
        if (!cancelled) setAuthorSuggestions([]);
      } finally {
        if (!cancelled) setAuthorLoading(false);
      }
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [authorInput]);

  const updateUrl = (q: string, genres: string[], creator: CreatorPreview | null, sort: MangaOrder | '', direction: MangaOrderDirection, p: number) => {
    const params = new URLSearchParams({ q, page: String(p), order_dir: direction });
    for (const genre of genres) params.append('genres', genre);
    if (creator) params.set('author', String(creator.id));
    if (sort) params.set('order_by', sort);
    setSearchParams(params, { replace: true });
  };

  // Initial load
  useEffect(() => {
    if (results.length > 0) return;
    runSearch(query, selectedTags, author, orderBy, orderDir, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setQuery(q);
    updateUrl(q, selectedTags, author, orderBy, orderDir, 1);
    runSearch(q, selectedTags, author, orderBy, orderDir, 1);
  };

  const chooseTag = (tag: { slug: string; name: string }) => {
    const genres = selectedTags.includes(tag.slug) ? selectedTags : [...selectedTags, tag.slug];
    setSelectedTags(genres);
    setTagInput('');
    setTagSuggestions([]);
    updateUrl(query, genres, author, orderBy, orderDir, 1);
    runSearch(query, genres, author, orderBy, orderDir, 1);
  };

  const removeTag = (tag: string) => {
    const tags = selectedTags.filter((selected) => selected !== tag);
    setSelectedTags(tags);
    updateUrl(query, tags, author, orderBy, orderDir, 1);
    runSearch(query, tags, author, orderBy, orderDir, 1);
  };

  const changeOrder = (sort: MangaOrder | '') => {
    setOrderBy(sort);
    updateUrl(query, selectedTags, author, sort, orderDir, 1);
    runSearch(query, selectedTags, author, sort, orderDir, 1);
  };

  const handleClear = () => {
    setQuery(DEFAULT_QUERY);
    setSelectedTags([]);
    setTagInput('');
    setOrderBy('');
    setOrderDir('desc');
    setAuthor(null);
    setAuthorInput('');
    updateUrl(DEFAULT_QUERY, [], null, '', 'desc', 1);
    runSearch(DEFAULT_QUERY, [], null, '', 'desc', 1);
  };

  const goToPage = (p: number) => {
    updateUrl(query, selectedTags, author, orderBy, orderDir, p);
    runSearch(query, selectedTags, author, orderBy, orderDir, p);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
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
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />{tc('actions.searching')}</>
            ) : (
              <><Search className="w-4 h-4 mr-2" />{tc('actions.search')}</>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-start">
          <div className="relative flex-1 min-w-[200px]">
            <Tag className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Filter by tag"
              className="pl-10"
              disabled={loading}
              data-testid="manga-tag-filter-input"
            />
            {(tagSuggestions.length > 0 || tagsLoading) && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                {tagsLoading ? (
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Loading tags…</div>
                ) : tagSuggestions.map((tag) => (
                  <button
                    key={tag.slug}
                    type="button"
                    onClick={() => chooseTag(tag)}
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    data-testid={`manga-tag-suggestion-${tag.slug}`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative min-w-[170px]">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={orderBy}
              onChange={(e) => changeOrder(e.target.value as MangaOrder | '')}
              disabled={loading}
              className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-10 pr-3 text-sm"
              aria-label="Sort manga"
              data-testid="manga-sort-select"
            >
              <option value="">Default order</option>
              <option value="trending">Trending</option>
              <option value="alphabet">Alphabetical</option>
              <option value="view">Most viewed</option>
              <option value="latest">Recently updated</option>
              <option value="created">Recently created</option>
            </select>
          </div>
          <select
            value={orderDir}
            onChange={(e) => { const direction = e.target.value as MangaOrderDirection; setOrderDir(direction); updateUrl(query, selectedTags, author, orderBy, direction, 1); runSearch(query, selectedTags, author, orderBy, direction, 1); }}
            disabled={loading}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Sort direction"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="relative max-w-md">
          <UserRound className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input value={authorInput} onChange={(e) => { setAuthorInput(e.target.value); if (!e.target.value) setAuthor(null); }} placeholder="Filter by author or artist" className="pl-10" disabled={loading} />
          {(authorSuggestions.length > 0 || authorLoading) && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
              {authorLoading ? <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading creators…</div> : authorSuggestions.map((creator) => (
                <button key={creator.id} type="button" onClick={() => { setAuthor(creator); setAuthorInput(creator.name); setAuthorSuggestions([]); updateUrl(query, selectedTags, creator, orderBy, orderDir, 1); runSearch(query, selectedTags, creator, orderBy, orderDir, 1); }} className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted">
                  {creator.name} <span className="text-xs text-muted-foreground">({creator.role})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" data-testid="manga-selected-tags">
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-sm p-0.5 hover:bg-background"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
              setSelectedTags([]);
              updateUrl(query, [], author, orderBy, orderDir, 1);
              runSearch(query, [], author, orderBy, orderDir, 1);
            }}>
              Clear tags
            </Button>
          </div>
        )}
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
