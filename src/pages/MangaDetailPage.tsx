import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Loader2,
  Tag,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getMangaDetail, type MangaDetail } from '@/lib/api/manga';

export default function MangaDetailPage() {
  const { mangaId } = useParams<{ mangaId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mangaId) {
      navigate('/manga');
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const d = await getMangaDetail(decodeURIComponent(mangaId));
        setDetail(d);
      } catch (err) {
        console.error(err);
        toast.error('Không tải được thông tin manga');
        navigate('/manga');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mangaId, navigate]);

  // Sort chapters by `chapter_index` ascending so the newest appears last;
  // we display them reversed (newest first) in the list. A stable sort also
  // handles missing indices gracefully.
  const sortedChapters = useMemo(() => {
    if (!detail) return [];
    return [...detail.chapters].sort((a, b) => {
      const ai = a.chapter_index ?? -Infinity;
      const bi = b.chapter_index ?? -Infinity;
      return bi - ai; // newest first
    });
  }, [detail]);

  const genreList = useMemo(() => {
    if (!detail?.genres) return [] as string[];
    return detail.genres
      .split(/[,/|]/)
      .map((g) => g.trim())
      .filter(Boolean);
  }, [detail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Info className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Không có dữ liệu manga.</p>
        <Button onClick={() => navigate('/manga')}>Quay lại</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Back */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/manga')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Trở lại
        </Button>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 mb-6">
        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border shadow-sm">
          {detail.cover ? (
            <img
              src={detail.cover}
              alt={detail.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <BookOpen className="w-12 h-12 opacity-30" />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
              {detail.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {detail.status && (
                <Badge variant="secondary" className="capitalize">
                  {detail.status}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <BookOpen className="w-3 h-3" />
                {detail.chapters.length} chương
              </Badge>
            </div>
          </div>

          {genreList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              {genreList.map((g) => (
                <Badge key={g} variant="outline" className="text-xs font-normal">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {detail.description && (
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Mô tả
              </p>
              <ScrollArea className="max-h-40">
                <p className="text-sm leading-relaxed whitespace-pre-wrap pr-3">
                  {detail.description}
                </p>
              </ScrollArea>
            </div>
          )}

          {/* Quick actions */}
          {sortedChapters.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                onClick={() =>
                  navigate(
                    `/manga/${encodeURIComponent(detail.id)}/read/${encodeURIComponent(
                      sortedChapters[sortedChapters.length - 1].id, // oldest = chapter 1
                    )}`,
                  )
                }
              >
                <BookOpen className="w-4 h-4 mr-1.5" /> Đọc từ đầu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate(
                    `/manga/${encodeURIComponent(detail.id)}/read/${encodeURIComponent(
                      sortedChapters[0].id, // newest
                    )}`,
                  )
                }
              >
                Chương mới nhất
              </Button>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Chapter list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Danh sách chương</h2>
          <p className="text-xs text-muted-foreground">
            {detail.chapters.length} chương
          </p>
        </div>

        {sortedChapters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Chưa có chương nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {sortedChapters.map((ch) => (
              <Card
                key={ch.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() =>
                  navigate(
                    `/manga/${encodeURIComponent(detail.id)}/read/${encodeURIComponent(ch.id)}`,
                  )
                }
                data-testid={`chapter-card-${ch.id}`}
              >
                <CardHeader className="pb-1.5 pt-3 px-3">
                  <CardTitle className="text-sm leading-tight flex items-center justify-between gap-2">
                    <span className="truncate">
                      {ch.title ||
                        (ch.chapter_index != null
                          ? `Chapter ${ch.chapter_index}`
                          : 'Chapter')}
                    </span>
                    {ch.chapter_index != null && (
                      <span className="text-xs font-normal text-muted-foreground flex-shrink-0">
                        #{ch.chapter_index}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-3">
                  {ch.date ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {ch.date}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/70 italic">—</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
