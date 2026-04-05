import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMangaDetail, getMangaChapters, type Manga, type MangaChapter } from '@/lib/api/manga';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function MangaDetailPage() {
  const { mangaId } = useParams<{ mangaId: string }>();
  const navigate = useNavigate();
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mangaId) return;
    Promise.all([getMangaDetail(mangaId), getMangaChapters(mangaId)]).then(([m, c]) => {
      setManga(m);
      setChapters(c);
      setLoading(false);
    });
  }, [mangaId]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  if (!manga) return <div className="p-6 text-sm text-muted-foreground">Không tìm thấy manga.</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate('/manga')} className="mb-4 text-muted-foreground gap-1">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Button>

      <div className="flex gap-6 mb-8">
        <img src={manga.coverUrl} alt={manga.title} className="w-32 md:w-40 rounded-2xl object-cover border border-border" />
        <div className="flex-1">
          <h2 className="font-display font-bold text-2xl text-foreground mb-2">{manga.title}</h2>
          <p className="text-sm text-muted-foreground mb-2">{manga.author}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {manga.genres.map(g => (
              <span key={g} className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full font-bold">{g}</span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{manga.description}</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">{manga.chapterCount} chương</p>
        </div>
      </div>

      <h3 className="font-bold text-foreground mb-3">Danh sách chương</h3>
      <div className="space-y-2">
        {chapters.map(ch => (
          <button
            key={ch.id}
            onClick={() => navigate(`/manga/${mangaId}/read/${ch.id}`)}
            className="w-full flex items-center justify-between bg-card border border-border rounded-xl p-3 hover:border-primary/40 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Chương {ch.number}</span>
                <span className="text-xs text-muted-foreground ml-2">{ch.title}</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{ch.pageCount} trang</span>
          </button>
        ))}
      </div>
    </div>
  );
}
