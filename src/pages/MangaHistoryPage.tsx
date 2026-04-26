import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2,
  History,
  BookOpen,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getMangaHistory,
  getChapterList,
  type ReadHistoryResponse,
  type ChapterInfo,
} from '@/lib/api/manga-real';
import { useAuth } from '@/lib/auth-context';

interface MangaHistoryWithDetails extends ReadHistoryResponse {
  mangaName?: string;
  coverUrl?: string;
  chapters?: ChapterInfo[];
}

export default function MangaHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<MangaHistoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const history = await getMangaHistory(user.id);
      console.log(history)
      
      // Sort by most recent first
      const sorted = [...history].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // Fetch chapter lists for each manga to get more details
      const enhanced = await Promise.all(
        sorted.map(async (item) => {
          try {
            const chapters = await getChapterList(item.manga_url);
            // Extract manga name from URL (last part after /)
            const mangaName = item.manga_url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Manga';
            return {
              ...item,
              mangaName,
              chapters,
            };
          } catch {
            return {
              ...item,
              mangaName: item.manga_url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Manga',
            };
          }
        })
      );

      setItems(enhanced);
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

  const handleContinueReading = (item: MangaHistoryWithDetails) => {
    const mangaId = item.manga_url.replace(/^\/manga\//, '');
    const chapterUrl = item.current_chapter_url.replace(/^\/manga\/[^/]+\//, '');
    navigate(`/manga/${encodeURIComponent(mangaId)}/read/${encodeURIComponent(chapterUrl)}`);
  };

  const handleViewManga = (item: MangaHistoryWithDetails) => {
    const mangaId = item.manga_url.replace(/^\/manga\//, '');
    navigate(`/manga/${encodeURIComponent(mangaId)}`);
  };

  return (
    <div className="animate-fade-in" data-testid="manga-history-page">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <Button variant="outline" size="sm" onClick={load} data-testid="reload-manga-history-btn" className="ml-auto">
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
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm line-clamp-2 mb-1 capitalize">
                      {item.mangaName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      <span className="truncate">
                        {item.current_chapter_name || 'Chapter'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(item.updated_at).toLocaleDateString('vi-VN')}</span>
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

                {item.chapters && item.chapters.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-[10px] text-muted-foreground">
                      {item.chapters.length} chapters có sẵn
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
