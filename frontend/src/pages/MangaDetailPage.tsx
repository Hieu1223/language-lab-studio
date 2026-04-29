import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getChapterList, type ChapterInfo } from '@/lib/api/manga';

export default function MangaDetailPage() {
  const { mangaId } = useParams() as { mangaId?: string };
  const navigate = useNavigate();

  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mangaId) {
      navigate('/manga');
      return;
    }

    const loadChapters = async () => {
      try {
        setLoading(true);

        // ✅ decode before sending to API
        const mangaUrl = decodeURIComponent(mangaId);

        console.log('Fetching:', mangaUrl);

        const chapterList = await getChapterList(mangaUrl);
        setChapters(chapterList);
      } catch (error) {
        toast.error('Failed to load chapters');
        console.error(error);
        navigate('/manga');
      } finally {
        setLoading(false);
      }
    };

    loadChapters();
  }, [mangaId, navigate]);

  // ✅ safe reverse (no mutation)
  const reversedChapters = useMemo(() => {
    return [...chapters].reverse();
  }, [chapters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/manga')}>
          ← Back to Manga
        </Button>
      </div>

      <div className="mb-8">
        <p className="text-sm text-muted-foreground">
          {chapters.length} chương có sẵn
        </p>
      </div>

      {reversedChapters.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No chapters found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reversedChapters.map((chapter) => (
            <Card
              key={chapter.url} // ✅ better key
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() =>
                navigate(
                  `/manga/${encodeURIComponent(mangaId || '')}/read/${encodeURIComponent(
                    chapter.url // ✅ this becomes chapterId
                  )}`
                )
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {chapter.title || `Chapter ${chapter.num}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Chapter {chapter.num}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}