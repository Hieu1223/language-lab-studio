import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMangaList, searchManga, type Manga } from '@/lib/api/manga';
import { Input } from '@/components/ui/input';
import { Search, BookMarked } from 'lucide-react';

export default function MangaPage() {
  const [query, setQuery] = useState('');
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'saved' | 'all'>('saved');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      (query ? searchManga(query) : getMangaList()).then(m => {
        setMangas(m);
        setLoading(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = tab === 'saved' ? mangas.filter(m => m.isSaved) : mangas;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Đọc Manga</h2>
        <p className="text-sm text-muted-foreground">Đọc manga tiếng Nhật với OCR và dịch tích hợp.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('saved')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'saved' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          <BookMarked className="w-4 h-4 inline mr-1" /> Đã lưu
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Tất cả
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm manga..." className="pl-9 bg-card border-border rounded-xl" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg mb-2">📚</p>
          <p className="text-sm">{tab === 'saved' ? 'Chưa lưu manga nào.' : 'Không tìm thấy manga.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map(manga => (
            <button
              key={manga.id}
              onClick={() => navigate(`/manga/${manga.id}`)}
              className="bg-card border border-border rounded-2xl overflow-hidden text-left hover:border-primary/40 transition-all hover:shadow-md group"
            >
              <div className="aspect-[2/3] bg-muted">
                <img src={manga.coverUrl} alt={manga.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{manga.title}</h3>
                <p className="text-xs text-muted-foreground">{manga.author}</p>
                {manga.lastRead && (
                  <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-mono mt-1 inline-block">{manga.lastRead}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
