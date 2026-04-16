import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';
import { searchManga, type MangaInfo } from '@/lib/api/manga-real';

export default function MangaPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MangaInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setSearching(true);
      const mangaResults = await searchManga(query);
      setResults(mangaResults);
      if (mangaResults.length === 0) {
        toast.info('No manga found');
      }
    } catch (error) {
      toast.error('Failed to search manga');
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl text-foreground mb-2">Manga</h2>
        <p className="text-sm text-muted-foreground">
          Tìm và đọc manga để ôn tập tiếng Nhật với OCR
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Tìm kiếm manga..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              disabled={searching}
            />
          </div>
          <Button type="submit" disabled={searching || !query.trim()}>
            {searching ? (
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

      {/* Results Grid */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Kết quả ({results.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((manga, idx) => (
              <Card
                key={idx}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/manga/${encodeURIComponent(manga.name)}`)}
              >
                <div className="aspect-[3/4] bg-muted overflow-hidden">
                  <img
                    src={manga.cover_url}
                    alt={manga.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm line-clamp-2">{manga.name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!searching && results.length === 0 && query && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No manga found. Try a different search.</p>
        </div>
      )}

      {!searching && results.length === 0 && !query && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Search for a manga to get started</p>
        </div>
      )}
    </div>
  );
}
