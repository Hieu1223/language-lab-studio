import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, BookmarkPlus, BookOpen, Sparkles, Wand2 } from 'lucide-react';
import type { WordLookupEntry } from '@/lib/api/dictionary';
import { useLookup } from '@/hooks/useLookup';
import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { TokenizeSentencePanel } from '@/components/dictionary/TokenizedSentence';
import { toast } from 'sonner';

// ─── Word lookup ────────────────────────────────────────────────────────────

function WordCard({ word, index }: { word: WordLookupEntry; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors group"
        data-testid={`word-card-${index}`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-2xl font-bold font-japanese leading-tight">{word.word}</p>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setOpen(true)}
            data-testid={`word-save-btn-${index}`}
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

function WordLookupPanel() {
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { results, loading, error, lookup } = useLookup(40);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    setSearched(true);
    const found = await lookup(query);
    if (found.length === 0) toast.info('Không tìm thấy từ phù hợp');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2" data-testid="word-search-form">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nhập từ, kana hoặc nghĩa tiếng Việt..."
          className="font-japanese"
          data-testid="word-search-input"
        />
        <Button type="submit" disabled={loading || !q.trim()} data-testid="word-search-btn">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="ml-1.5 hidden sm:inline">Tra cứu</span>
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {results.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{results.length} kết quả</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBulkOpen(true)}>
            <BookmarkPlus className="w-3.5 h-3.5" />
            Thêm tất cả
          </Button>
        </div>
      )}

      {loading && (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && searched && !error && results.length === 0 && (
        <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground text-center">
          <BookOpen className="w-8 h-8 opacity-40" />
          <p className="text-sm">Không tìm thấy mục từ điển nào.</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground text-center">
          <Sparkles className="w-8 h-8 opacity-40" />
          <p className="text-sm max-w-sm">
            Tra cứu một từ tiếng Nhật và lưu thẳng vào bộ flashcard của bạn.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((w, i) => (
          <WordCard key={`${w.id}-${i}`} word={w} index={i} />
        ))}
      </div>

      <AddToDeckDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        words={results}
        title={`Thêm ${results.length} từ vào bộ`}
      />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DictionaryPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in" data-testid="dictionary-page">
      <header className="mb-6">
        <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Từ điển
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tra từ đơn lẻ, hoặc dán cả câu để tách từ và tra từng token.
        </p>
      </header>

      <Tabs defaultValue="words">
        <TabsList className="mb-4">
          <TabsTrigger value="words" className="gap-1.5" data-testid="tab-words">
            <BookOpen className="w-3.5 h-3.5" /> Từ vựng
          </TabsTrigger>
          <TabsTrigger value="sentence" className="gap-1.5" data-testid="tab-sentence">
            <Wand2 className="w-3.5 h-3.5" /> Phân tích câu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="words">
          <WordLookupPanel />
        </TabsContent>

        <TabsContent value="sentence">
          <TokenizeSentencePanel initialText="" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
