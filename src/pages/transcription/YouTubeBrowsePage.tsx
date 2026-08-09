import { BookmarkletModal } from '@/components/BookmarkletModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { searchYouTube, type VideoPreview } from '@/lib/api/transcription';
import { Bookmark, Loader2, Play, Search, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

// Default query used for the YouTube "mainpage" list.
// Per spec: mainpage reuses the /youtube/search endpoint with a default query.
const DEFAULT_MAINPAGE_QUERY = '日本語学習';

const QUERY_STORAGE_KEY = 'yt-browse-query';
const RESULTS_STORAGE_KEY = 'yt-browse-results';
const MODE_STORAGE_KEY = 'yt-browse-mode';

type BrowseMode = 'mainpage' | 'search';

export default function YouTubeBrowsePage() {
  const navigate = useNavigate();
  const { t } = useTranslation('transcription');
  const { t: tc } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate query from ?q= or session storage
  const initialQuery =
    searchParams.get('q') ?? sessionStorage.getItem(QUERY_STORAGE_KEY) ?? '';
  const initialMode: BrowseMode =
    (searchParams.get('mode') as BrowseMode) ??
    ((sessionStorage.getItem(MODE_STORAGE_KEY) as BrowseMode) ||
      (initialQuery ? 'search' : 'mainpage'));

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<VideoPreview[]>(() => {
    const cached = sessionStorage.getItem(RESULTS_STORAGE_KEY);
    try {
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [mode, setMode] = useState<BrowseMode>(initialMode);
  const [searching, setSearching] = useState(false);
  const [bookmarkletModalOpen, setBookmarkletModalOpen] = useState(false);

  // Persist query/mode/results
  useEffect(() => {
    sessionStorage.setItem(QUERY_STORAGE_KEY, query);
  }, [query]);
  useEffect(() => {
    sessionStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);
  useEffect(() => {
    sessionStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results));
  }, [results]);

  const runSearch = useCallback(
    async (q: string, targetMode: BrowseMode) => {
      try {
        setSearching(true);
        const items = await searchYouTube(q, 50); // Increased from 20 to 50
        setResults(items);
        setMode(targetMode);
        if (items.length === 0) toast.info(t('browse.noResults'));
      } catch (err) {
        toast.error(t('browse.searchFailed'));
        console.error(err);
      } finally {
        setSearching(false);
      }
    },
    [t],
  );

  // Load mainpage on first mount if results are empty
  useEffect(() => {
    if (results.length === 0) {
      runSearch(
        mode === 'search' && query.trim() ? query.trim() : DEFAULT_MAINPAGE_QUERY,
        mode === 'search' && query.trim() ? 'search' : 'mainpage',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query.trim(), mode: 'search' }, { replace: true });
    runSearch(query.trim(), 'search');
  };

  const handleClear = () => {
    setQuery('');
    setSearchParams({}, { replace: true });
    runSearch(DEFAULT_MAINPAGE_QUERY, 'mainpage');
  };

  const handleViewVideo = (video: VideoPreview) => {
    // Keep the current browse state so we return to it
    sessionStorage.setItem('selectedVideo', JSON.stringify(video));
    navigate(`/youtube/video/${video.id}`);
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setBookmarkletModalOpen(true)}
          className="w-full md:w-auto"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          {t('browse.bookmarklet')}
        </Button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={t('browse.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              disabled={searching}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                aria-label={t('browse.clearSearch')}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button type="submit" disabled={searching || !query.trim()}>
            {searching ? (
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
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={searching}
            title={t('browse.clearAllTitle')}
          >
            <X className="w-4 h-4 mr-1" />
            {t('browse.clearAll')}
          </Button>
        </div>
      </form>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {mode === 'mainpage' ? (
          <>
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">{t('browse.suggested')}</h3>
            <span className="text-xs text-muted-foreground">
              {t('browse.defaultQuery', { query: DEFAULT_MAINPAGE_QUERY })}
            </span>
          </>
        ) : (
          <h3 className="text-base font-semibold text-foreground">
            {t('browse.resultsFor', { query, count: results.length })}
          </h3>
        )}
      </div>

      {/* Results Grid */}
      {searching && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">{tc('states.loadingShort')}</p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((video) => (
            <Card
              key={video.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleViewVideo(video)}
            >
              <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Play className="w-8 h-8 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewVideo(video);
                    }}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {t('browse.watchVideo')}
                  </Button>
                </div>
                {video.duration && (
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {video.duration}
                  </div>
                )}
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="text-sm line-clamp-2">{video.title}</CardTitle>
                <CardDescription className="text-xs">
                  {video.channel.name || t('browse.unknownChannel')}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {video.view_count !== null && (
                    <p>{t('browse.viewCount', { count: video.view_count.toLocaleString() })}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>{t('browse.empty')}</p>
        </div>
      )}

      <BookmarkletModal
        isOpen={bookmarkletModalOpen}
        onClose={() => setBookmarkletModalOpen(false)}
      />
    </>
  );
}
