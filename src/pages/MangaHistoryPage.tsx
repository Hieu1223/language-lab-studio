import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, BookOpen, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getMangaHistory, type ReadHistoryResponse } from '@/lib/api/manga';
import { useAuth } from '@/lib/auth-context';

export default function MangaHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ReadHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      // Backend already returns sorted by updated_at desc
      const history = await getMangaHistory(user.id);
      setItems(history);
    } catch {
      toast.error('Không tải được lịch sử đọc manga');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleContinueReading = (item: ReadHistoryResponse) => {
    const mangaId = item.manga_url.replace(/^\/manga\//, '');
    const chapterUrl = item.chapter_url.replace(/^\/manga\/[^/]+\//, '');
    const params = new URLSearchParams();
    if (item.manga_name) params.set('manga_name', item.manga_name);
    if (item.manga_cover_url) params.set('manga_cover_url', item.manga_cover_url);
    navigate(
      `/manga/${encodeURIComponent(mangaId)}/read/${encodeURIComponent(chapterUrl)}?${params.toString()}`
    );
  };

  const handleViewManga = (item: ReadHistoryResponse) => {
    const mangaId = item.manga_url.replace(/^\/manga\//, '');
    navigate(`/manga/${encodeURIComponent(mangaId)}`);
  };
  console.log(items)

  return (
    <div className="animate-fade-in" data-testid="manga-history-page">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          data-testid="reload-manga-history-btn"
          className="ml-auto"
        >
          Làm mới
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <BookOpen className="w-10 h-10 opacity-40" />
          <p className="text-sm text-muted-foreground">Chưa có lịch sử đọc manga nào.</p>
          <Button onClick={() => navigate('/manga')} size="sm">
            Khám phá Manga
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden hover:shadow-lg transition-all group border-2 hover:border-primary/40"
            >
              <div className="flex gap-3 p-4">
                {/* Cover image */}
                {item.manga_cover_url ? (
                  <img
                    src={item.manga_cover_url}
                    alt={item.manga_name}
                    className="w-16 h-24 object-cover rounded shrink-0"
                  />
                ) : (
                  <div className="w-16 h-24 rounded bg-muted shrink-0 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 opacity-30" />
                  </div>
                )}

                {/* Info */}
                <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm line-clamp-2 capitalize">
                      {item.manga_name || item.manga_url.split('/').pop()?.replace(/-/g, ' ')}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {item.chapter_title || `Chapter ${item.chapter_num}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{new Date(item.updated_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5"
                      onClick={() => handleContinueReading(item)}
                      data-testid={`continue-reading-${item.id}`}
                    >
                      <BookOpen className="w-3 h-3" /> Tiếp tục đọc
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => handleViewManga(item)}
                      data-testid={`view-manga-${item.id}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}