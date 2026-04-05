import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChapterPages, getMangaChapters, ocrMangaPage, type MangaPage, type MangaChapter } from '@/lib/api/manga';
import { Button } from '@/components/ui/button';
import { ArrowLeft, List, ChevronLeft, ChevronRight, ScanText, X, BookOpen, Columns2, Rows3 } from 'lucide-react';

type ReadingMode = 'vertical' | 'single' | 'double';

export default function MangaReaderPage() {
  const { mangaId, chapterId } = useParams<{ mangaId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [readingMode, setReadingMode] = useState<ReadingMode>('vertical');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ocrResults, setOcrResults] = useState<Record<string, { ocrText: string; translation: string }>>({});
  const [ocrLoading, setOcrLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId || !mangaId) return;
    setLoading(true);
    Promise.all([getChapterPages(chapterId), getMangaChapters(mangaId)]).then(([p, c]) => {
      setPages(p);
      setChapters(c);
      setLoading(false);
      setCurrentPage(0);
    });
  }, [chapterId, mangaId]);

  const handleOcr = async (pageId: string) => {
    setOcrLoading(pageId);
    const result = await ocrMangaPage(pageId);
    setOcrResults(prev => ({ ...prev, [pageId]: result }));
    setOcrLoading(null);
  };

  const currentChapterIdx = chapters.findIndex(c => c.id === chapterId);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;

  const renderPage = (page: MangaPage, idx: number) => (
    <div key={page.id} className="relative group">
      <img src={page.imageUrl} alt={`Trang ${page.pageNumber}`} className="w-full rounded-xl border border-border" />
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-xl gap-1 text-xs"
          onClick={() => handleOcr(page.id)}
          disabled={ocrLoading === page.id}
        >
          <ScanText className="w-3 h-3" />
          {ocrLoading === page.id ? '...' : 'OCR'}
        </Button>
      </div>
      {ocrResults[page.id] && (
        <div className="mt-2 p-3 bg-card border border-border rounded-xl text-sm space-y-1">
          <p className="text-foreground font-bold">{ocrResults[page.id].ocrText}</p>
          <p className="text-muted-foreground">{ocrResults[page.id].translation}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border p-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/manga/${mangaId}`)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <span className="text-xs font-mono text-muted-foreground">
            Ch. {chapters[currentChapterIdx]?.number} · {readingMode === 'vertical' ? 'Cuộn' : readingMode === 'single' ? '1 trang' : '2 trang'}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <List className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 max-w-3xl mx-auto">
          {readingMode === 'vertical' ? (
            <div className="space-y-2">
              {pages.map((p, i) => renderPage(p, i))}
            </div>
          ) : readingMode === 'single' ? (
            <div>
              {pages[currentPage] && renderPage(pages[currentPage], currentPage)}
              <div className="flex justify-center gap-4 mt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0} className="rounded-xl">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground font-mono self-center">{currentPage + 1}/{pages.length}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))} disabled={currentPage >= pages.length - 1} className="rounded-xl">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-2">
                {pages[currentPage] && renderPage(pages[currentPage], currentPage)}
                {pages[currentPage + 1] && renderPage(pages[currentPage + 1], currentPage + 1)}
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(0, currentPage - 2))} disabled={currentPage === 0} className="rounded-xl">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground font-mono self-center">{currentPage + 1}-{Math.min(currentPage + 2, pages.length)}/{pages.length}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 2))} disabled={currentPage >= pages.length - 2} className="rounded-xl">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-72 border-l border-border bg-card overflow-y-auto flex-shrink-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-bold text-sm text-foreground">Menu</span>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}><X className="w-4 h-4" /></Button>
          </div>

          {/* Reading mode */}
          <div className="p-3 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground mb-2">Kiểu đọc</p>
            <div className="flex gap-1">
              {([['vertical', Rows3, 'Cuộn'], ['single', BookOpen, '1 trang'], ['double', Columns2, '2 trang']] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  onClick={() => { setReadingMode(mode); setCurrentPage(0); }}
                  className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-colors ${readingMode === mode ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Chapters */}
          <div className="p-3">
            <p className="text-xs font-bold text-muted-foreground mb-2">Chương</p>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {chapters.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => navigate(`/manga/${mangaId}/read/${ch.id}`)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${ch.id === chapterId ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  Ch. {ch.number}: {ch.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
