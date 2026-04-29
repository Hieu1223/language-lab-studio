import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Search,
  BookmarkPlus,
  BookOpen,
  Sparkles,
  Type,
} from 'lucide-react';
import { searchWords, type WordResponse } from '@/lib/api/flashcard';
import { searchKanji, getKanji, type KanjiResponse } from '@/lib/api/tokenization';
import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { toast } from 'sonner';
import type { WordEntry } from '@/lib/api/tokenization';

// ─── Word search panel ─────────────────────────────────────────────────────

function WordCard({ word }: { word: WordResponse }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors group"
        data-testid={`word-card-${word.id}`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-2xl font-bold font-japanese leading-tight">{word.word}</p>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setOpen(true)}
            data-testid={`word-save-btn-${word.id}`}
            title="Lưu vào bộ"
          >
            <BookmarkPlus className="w-4 h-4 text-primary" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground font-japanese mb-2">{word.reading}</p>
        <p className="text-sm leading-snug">{word.meaning}</p>
      </div>
      <AddToDeckDialog open={open} onOpenChange={setOpen} words={[word]} />
    </>
  );
}

function WordSearchPanel() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<WordResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    try {
      setLoading(true);
      const data = await searchWords(q.trim(), 30);
      setResults(data);
      if (data.length === 0) toast.info('Không tìm thấy từ phù hợp');
    } catch {
      toast.error('Tìm kiếm thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo từ, kana hoặc nghĩa..."
          className="flex-1"
          data-testid="word-search-input"
        />
        <Button type="submit" disabled={loading} data-testid="word-search-btn">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </form>

      {results.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{results.length} kết quả</span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setBulkOpen(true)}
            data-testid="word-bulk-add-btn"
          >
            <BookmarkPlus className="w-3 h-3" /> Thêm tất cả
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.map((w) => (
          <WordCard key={w.id} word={w} />
        ))}
      </div>

      {!loading && results.length === 0 && (
        <div className="py-12 flex flex-col items-center text-muted-foreground gap-2">
          <BookOpen className="w-8 h-8 opacity-50" />
          <p className="text-sm">Tìm từ tiếng Nhật để xem nghĩa và lưu vào bộ.</p>
        </div>
      )}

      <AddToDeckDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        words={results as WordEntry[]}
        title={`Thêm ${results.length} từ vào bộ`}
      />
    </div>
  );
}

// ─── Kanji panel ──────────────────────────────────────────────────────────

function KanjiCard({ kanji, onPick }: { kanji: KanjiResponse; onPick?: (k: KanjiResponse) => void }) {
  return (
    <button
      onClick={() => onPick?.(kanji)}
      className="rounded-xl border bg-card p-4 text-left hover:border-primary/60 transition-all group"
      data-testid={`kanji-card-${kanji.id}`}
    >
      <p className="text-4xl font-bold font-japanese mb-1 group-hover:text-primary transition-colors">
        {kanji.kanji}
      </p>
      {kanji.reading && (
        <p className="text-xs text-muted-foreground font-japanese mb-1">{kanji.reading}</p>
      )}
      {kanji.meanings && (
        <p className="text-xs text-muted-foreground line-clamp-2">{kanji.meanings}</p>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {kanji.strokes != null && (
          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {kanji.strokes} nét
          </span>
        )}
        {kanji.radical && (
          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-japanese">
            {kanji.radical}
          </span>
        )}
      </div>
    </button>
  );
}

function KanjiDetail({ kanji, onClose }: { kanji: KanjiResponse; onClose: () => void }) {
  const [bulkOpen, setBulkOpen] = useState(false);
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4" data-testid="kanji-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-6xl font-bold font-japanese leading-none mb-2">{kanji.kanji}</p>
          {kanji.reading && (
            <p className="text-sm text-muted-foreground font-japanese">{kanji.reading}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Đóng
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {[
          ['Nét', kanji.strokes],
          ['Bộ', kanji.radical],
          ['Hình', kanji.shape],
          ['Unicode', kanji.unicode],
        ].map(([k, v]) =>
          v ? (
            <div key={k as string} className="rounded-md bg-muted/40 p-2">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
                {k}
              </p>
              <p className="font-medium font-japanese">{v}</p>
            </div>
          ) : null,
        )}
      </div>

      {kanji.meanings && (
        <div>
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">
            Ý nghĩa
          </p>
          <p className="text-sm leading-snug">{kanji.meanings}</p>
        </div>
      )}

      {kanji.words.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
              Từ liên quan ({kanji.words.length})
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setBulkOpen(true)}
              data-testid="kanji-bulk-add-btn"
            >
              <BookmarkPlus className="w-3 h-3" /> Thêm tất cả
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {kanji.words.map((w) => (
              <WordCard key={w.id} word={w} />
            ))}
          </div>
        </div>
      )}

      <AddToDeckDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        words={kanji.words}
        title={`Thêm ${kanji.words.length} từ chứa "${kanji.kanji}"`}
      />
    </div>
  );
}

function KanjiPanel() {
  const [reading, setReading] = useState('');
  const [results, setResults] = useState<KanjiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [singleQuery, setSingleQuery] = useState('');
  const [active, setActive] = useState<KanjiResponse | null>(null);

  const handleReadingSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!reading.trim()) return;
    try {
      setLoading(true);
      setActive(null);
      const data = await searchKanji(reading.trim(), 40);
      setResults(data);
      if (data.length === 0) toast.info('Không tìm thấy kanji');
    } catch {
      toast.error('Tìm kanji thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    const c = singleQuery.trim().slice(0, 1);
    if (!c) return;
    try {
      setLoading(true);
      const k = await getKanji(c);
      setActive(k);
    } catch {
      toast.error('Không tìm thấy kanji này');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <form onSubmit={handleReadingSearch} className="flex gap-2">
          <Input
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            placeholder="Tìm kanji theo Hán-Việt (vd: nhật, học)..."
            data-testid="kanji-reading-input"
          />
          <Button type="submit" disabled={loading} data-testid="kanji-search-btn">
            <Search className="w-4 h-4" />
          </Button>
        </form>
        <div className="flex gap-2">
          <Input
            value={singleQuery}
            onChange={(e) => setSingleQuery(e.target.value)}
            placeholder="Tra cứu một kanji (vd: 日)"
            maxLength={1}
            className="font-japanese text-lg"
            data-testid="kanji-single-input"
          />
          <Button
            onClick={handleLookup}
            disabled={loading || !singleQuery.trim()}
            data-testid="kanji-lookup-btn"
          >
            <Type className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && active && (
        <KanjiDetail kanji={active} onClose={() => setActive(null)} />
      )}

      {!loading && !active && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {results.map((k) => (
            <KanjiCard key={k.id} kanji={k} onPick={setActive} />
          ))}
        </div>
      )}

      {!loading && !active && results.length === 0 && (
        <div className="py-12 flex flex-col items-center text-muted-foreground gap-2">
          <Sparkles className="w-8 h-8 opacity-50" />
          <p className="text-sm">Tra cứu kanji theo Hán-Việt hoặc nhập trực tiếp một kanji.</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function DictionaryPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in" data-testid="dictionary-page">
      <header className="mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Từ điển
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tra từ vựng và Kanji. Lưu trực tiếp vào bộ flashcard.
        </p>
      </header>

      <Tabs defaultValue="words">
        <TabsList className="mb-4">
          <TabsTrigger value="words" data-testid="dict-tab-words">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Từ vựng
          </TabsTrigger>
          <TabsTrigger value="kanji" data-testid="dict-tab-kanji">
            <Type className="w-3.5 h-3.5 mr-1.5" /> Kanji
          </TabsTrigger>
        </TabsList>
        <TabsContent value="words">
          <WordSearchPanel />
        </TabsContent>
        <TabsContent value="kanji">
          <KanjiPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
