import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChapterPages, getMangaChapters, ocrMangaPage, lookupMangaWord, sendMangaChat } from '@/lib/api/manga';
import type { MangaPage, MangaChapter, OcrResult, OcrWord, MangaChatMessage } from '@/lib/api/manga';
import { addCard } from '@/lib/api/flashcard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, List, ChevronLeft, ChevronRight, ScanText, X, BookOpen, Columns2, Rows3, MessageCircle, Search, Plus } from 'lucide-react';

type ReadingMode = 'vertical' | 'single' | 'double';
type SideTab = 'chapters' | 'lookup' | 'chat';
const USER_ID = 'current-user';

export default function MangaReaderPage() {
  const { mangaId, chapterId } = useParams<{ mangaId: string; chapterId: string }>();
  const navigate = useNavigate();
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [readingMode, setReadingMode] = useState<ReadingMode>('vertical');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sideTab, setSideTab] = useState<SideTab>('chapters');
  const [ocrResults, setOcrResults] = useState<Record<string, OcrResult>>({});
  const [ocrLoading, setOcrLoading] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<OcrWord | null>(null);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<{ word: string; reading: string; meaning: string; examples: string[] } | null>(null);
  const [chatMessages, setChatMessages] = useState<MangaChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrentPage(prev => Math.min(pages.length - 1, prev + 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCurrentPage(prev => Math.max(0, prev - 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pages.length]);

  const handleOcr = async (pageId: string) => {
    setOcrLoading(pageId);
    const result = await ocrMangaPage(pageId);
    setOcrResults(prev => ({ ...prev, [pageId]: result }));
    setOcrLoading(null);
  };

  const handleWordClick = (word: OcrWord) => {
    setSelectedWord(word);
    setSideTab('lookup');
    if (!sidebarOpen) setSidebarOpen(true);
  };

  const handleAddWordToFlashcard = async (word: OcrWord) => {
    await addCard(USER_ID, word.text, 'topic-noun', 'col-default');
    // Update the OCR result to reflect the word is now in flashcards
    setOcrResults(prev => {
      const updated = { ...prev };
      for (const pageId of Object.keys(updated)) {
        updated[pageId] = {
          ...updated[pageId],
          words: updated[pageId].words.map(w => w.text === word.text ? { ...w, existsInFlashcards: true } : w),
        };
      }
      return updated;
    });
  };

  const handleLookup = async () => {
    if (!lookupQuery.trim()) return;
    const result = await lookupMangaWord(lookupQuery.trim());
    setLookupResult(result);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: MangaChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: chatInput, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    const response = await sendMangaChat(chatInput, selectedWord?.text || '');
    setChatMessages(prev => [...prev, response.message]);
    setChatLoading(false);
  };

  const currentChapterIdx = chapters.findIndex(c => c.id === chapterId);

  if (loading) return <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">Đang tải...</div>;

  const renderPage = (page: MangaPage, idx: number) => {
    const ocr = ocrResults[page.id];
    return (
      <div key={page.id} className="relative group" style={{ aspectRatio: `${page.width}/${page.height}` }}>
        <img
          src={page.imageUrl}
          alt={`Trang ${page.pageNumber}`}
          className="w-full h-full object-contain rounded-xl border border-border"
        />
        {/* OCR text overlay on the page */}
        {ocr && ocr.words.map((word, wi) => (
          <button
            key={wi}
            onClick={() => handleWordClick(word)}
            className={`absolute border-2 rounded transition-all text-xs font-bold flex items-center justify-center hover:bg-primary/20 ${
              word.existsInFlashcards ? 'border-primary/40 bg-primary/10' : 'border-yellow-400/60 bg-yellow-400/10 hover:border-yellow-400'
            }`}
            style={{
              left: `${(word.x / page.width) * 100}%`,
              top: `${(word.y / page.height) * 100}%`,
              width: `${(word.width / page.width) * 100}%`,
              height: `${(word.height / page.height) * 100}%`,
            }}
            title={`${word.text} — ${word.meaning}`}
          >
            <span className="bg-background/80 px-0.5 rounded text-[10px] text-foreground truncate">{word.text}</span>
          </button>
        ))}
        {/* OCR button */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="secondary" className="rounded-xl gap-1 text-xs" onClick={() => handleOcr(page.id)} disabled={ocrLoading === page.id}>
            <ScanText className="w-3 h-3" />
            {ocrLoading === page.id ? '...' : 'OCR'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border p-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/manga/${mangaId}`)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              Ch. {chapters[currentChapterIdx]?.number} · Trang {currentPage + 1}/{pages.length}
            </span>
            <div className="flex gap-0.5">
              {([['vertical', Rows3], ['single', BookOpen], ['double', Columns2]] as const).map(([mode, Icon]) => (
                <button key={mode} onClick={() => { setReadingMode(mode); setCurrentPage(0); }} className={`p-1 rounded ${readingMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <List className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 max-w-3xl mx-auto">
          {readingMode === 'vertical' ? (
            <div className="space-y-2">{pages.map((p, i) => renderPage(p, i))}</div>
          ) : readingMode === 'single' ? (
            <div>
              {pages[currentPage] && renderPage(pages[currentPage], currentPage)}
              <div className="flex justify-center gap-4 mt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-muted-foreground font-mono self-center">{currentPage + 1}/{pages.length}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))} disabled={currentPage >= pages.length - 1}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-2">
                {pages[currentPage] && renderPage(pages[currentPage], currentPage)}
                {pages[currentPage + 1] && renderPage(pages[currentPage + 1], currentPage + 1)}
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(0, currentPage - 2))} disabled={currentPage === 0}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-muted-foreground font-mono self-center">{currentPage + 1}-{Math.min(currentPage + 2, pages.length)}/{pages.length}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 2))} disabled={currentPage >= pages.length - 2}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-80 border-l border-border bg-card overflow-hidden flex-shrink-0 flex flex-col">
          <div className="p-2 border-b border-border flex gap-1">
            {([['chapters', List, 'Chương'], ['lookup', Search, 'Tra cứu'], ['chat', MessageCircle, 'Chat']] as const).map(([tab, Icon, label]) => (
              <button key={tab} onClick={() => setSideTab(tab as SideTab)} className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${sideTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {sideTab === 'chapters' && (
              <div className="space-y-1">
                {chapters.map(ch => (
                  <button key={ch.id} onClick={() => navigate(`/manga/${mangaId}/read/${ch.id}`)} className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${ch.id === chapterId ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:bg-muted'}`}>
                    Ch. {ch.number}: {ch.title}
                  </button>
                ))}
              </div>
            )}

            {sideTab === 'lookup' && (
              <div className="space-y-3">
                {selectedWord && (
                  <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground text-lg">{selectedWord.text}</p>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedWord(null)} className="w-5 h-5 p-0"><X className="w-3 h-3" /></Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedWord.reading}</p>
                    <p className="text-sm text-foreground">{selectedWord.meaning}</p>
                    {selectedWord.existsInFlashcards ? (
                      <span className="text-[10px] text-primary font-bold">✓ Đã có trong flashcard</span>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-1 text-xs mt-1" onClick={() => handleAddWordToFlashcard(selectedWord)}>
                        <Plus className="w-3 h-3" /> Thêm vào flashcard
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex gap-1">
                  <Input value={lookupQuery} onChange={e => setLookupQuery(e.target.value)} placeholder="Tra từ..." className="text-sm" onKeyDown={e => e.key === 'Enter' && handleLookup()} />
                  <Button size="sm" onClick={handleLookup}><Search className="w-3.5 h-3.5" /></Button>
                </div>
                {lookupResult && (
                  <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                    <p className="font-bold text-foreground">{lookupResult.word}</p>
                    <p className="text-xs text-muted-foreground">{lookupResult.reading}</p>
                    <p className="text-foreground">{lookupResult.meaning}</p>
                    <div className="text-xs text-muted-foreground">
                      {lookupResult.examples.map((ex, i) => <p key={i}>• {ex}</p>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {sideTab === 'chat' && (
              <div className="space-y-2">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`rounded-xl p-2.5 text-sm ${msg.role === 'user' ? 'bg-primary/10 text-foreground ml-6' : 'bg-muted text-foreground mr-6'}`}>
                    {msg.content}
                  </div>
                ))}
                {chatLoading && <div className="text-xs text-muted-foreground animate-pulse">Đang trả lời...</div>}
              </div>
            )}
          </div>

          {sideTab === 'chat' && (
            <div className="p-2 border-t border-border flex gap-1">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Hỏi về manga..." className="text-sm" onKeyDown={e => e.key === 'Enter' && handleChat()} />
              <Button size="sm" onClick={handleChat} disabled={chatLoading}>Gửi</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
