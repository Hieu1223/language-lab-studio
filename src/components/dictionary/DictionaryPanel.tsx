import { useState } from 'react';
import { Loader2, Search, BookOpen, Type, BookmarkPlus, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { searchWords, type WordResponse } from '@/lib/api/flashcard';
import { searchKanji, getKanji, type KanjiResponse } from '@/lib/api/tokenization';
import { AddToDeckDialog } from './AddToDeckDialog';

/**
 * Reusable two-mode dictionary panel (Vocab / Kanji).
 * Designed to fit inside any right drawer / side panel.
 */
export function DictionaryPanel() {
  const [mode, setMode] = useState<'words' | 'kanji'>('words');

  const [wordQ, setWordQ] = useState('');
  const [wordResults, setWordResults] = useState<WordResponse[]>([]);
  const [wordLoading, setWordLoading] = useState(false);
  const [wordAddOpen, setWordAddOpen] = useState(false);
  const [pickedWord, setPickedWord] = useState<WordResponse | null>(null);

  const [kanjiReading, setKanjiReading] = useState('');
  const [kanjiSingle, setKanjiSingle] = useState('');
  const [kanjiResults, setKanjiResults] = useState<KanjiResponse[]>([]);
  const [activeKanji, setActiveKanji] = useState<KanjiResponse | null>(null);
  const [kanjiLoading, setKanjiLoading] = useState(false);
  const [kanjiAddOpen, setKanjiAddOpen] = useState(false);

  const doWordSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!wordQ.trim()) return;
    try {
      setWordLoading(true);
      const data = await searchWords(wordQ.trim(), 30);
      setWordResults(data);
      if (data.length === 0) toast.info('Không tìm thấy từ phù hợp');
    } catch {
      toast.error('Tìm kiếm thất bại');
    } finally {
      setWordLoading(false);
    }
  };

  const doKanjiReadingSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!kanjiReading.trim()) return;
    try {
      setKanjiLoading(true);
      setActiveKanji(null);
      const data = await searchKanji(kanjiReading.trim(), 30);
      setKanjiResults(data);
      if (data.length === 0) toast.info('Không tìm thấy kanji');
    } catch {
      toast.error('Tìm kanji thất bại');
    } finally {
      setKanjiLoading(false);
    }
  };

  const doKanjiLookup = async () => {
    const c = kanjiSingle.trim().slice(0, 1);
    if (!c) return;
    try {
      setKanjiLoading(true);
      const k = await getKanji(c);
      setActiveKanji(k);
    } catch {
      toast.error('Không tìm thấy kanji này');
    } finally {
      setKanjiLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border flex gap-1 flex-shrink-0">
        <button
          onClick={() => setMode('words')}
          className={`flex-1 text-xs h-7 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'words' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <BookOpen className="w-3 h-3" /> Từ vựng
        </button>
        <button
          onClick={() => setMode('kanji')}
          className={`flex-1 text-xs h-7 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'kanji' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <Type className="w-3 h-3" /> Kanji
        </button>
      </div>

      {mode === 'words' ? (
        <>
          <form onSubmit={doWordSearch} className="p-3 flex gap-1.5 border-b border-border flex-shrink-0">
            <Input
              value={wordQ}
              onChange={(e) => setWordQ(e.target.value)}
              placeholder="Từ, kana hoặc nghĩa..."
              className="h-8 text-xs"
            />
            <Button type="submit" size="icon" className="h-8 w-8" disabled={wordLoading}>
              {wordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </Button>
          </form>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {wordResults.length === 0 && !wordLoading && (
                <div className="py-8 flex flex-col items-center text-muted-foreground gap-2 text-center">
                  <Sparkles className="w-6 h-6 opacity-40" />
                  <p className="text-xs leading-snug">Tìm từ tiếng Nhật ngay tại đây — kết quả có thể lưu vào bộ flashcard.</p>
                </div>
              )}
              {wordResults.map((w) => (
                <div key={w.id} className="rounded-md border bg-card p-2.5 hover:border-primary/40 transition-colors group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold font-japanese leading-tight truncate">{w.word}</p>
                      <p className="text-[11px] text-muted-foreground font-japanese truncate">{w.reading}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 flex-shrink-0 opacity-60 group-hover:opacity-100"
                      title="Lưu vào bộ"
                      onClick={() => { setPickedWord(w); setWordAddOpen(true); }}
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </div>
                  <p className="text-[11px] mt-1 leading-snug line-clamp-3">{w.meaning}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <AddToDeckDialog
            open={wordAddOpen}
            onOpenChange={(o) => { setWordAddOpen(o); if (!o) setPickedWord(null); }}
            words={pickedWord ? [pickedWord] : []}
          />
        </>
      ) : (
        <>
          <div className="p-3 space-y-2 border-b border-border flex-shrink-0">
            <form onSubmit={doKanjiReadingSearch} className="flex gap-1.5">
              <Input
                value={kanjiReading}
                onChange={(e) => setKanjiReading(e.target.value)}
                placeholder="Hán-Việt (vd: nhật)..."
                className="h-8 text-xs"
              />
              <Button type="submit" size="icon" className="h-8 w-8" disabled={kanjiLoading}>
                <Search className="w-3.5 h-3.5" />
              </Button>
            </form>
            <div className="flex gap-1.5">
              <Input
                value={kanjiSingle}
                onChange={(e) => setKanjiSingle(e.target.value)}
                placeholder="Một kanji (vd: 日)"
                maxLength={1}
                className="h-8 text-base font-japanese"
              />
              <Button
                size="icon"
                className="h-8 w-8"
                disabled={kanjiLoading || !kanjiSingle.trim()}
                onClick={doKanjiLookup}
              >
                <Type className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {kanjiLoading && (
                <div className="py-6 flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
              {!kanjiLoading && activeKanji && (
                <div className="rounded-md border bg-card p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-4xl font-bold font-japanese leading-none">{activeKanji.kanji}</p>
                      {activeKanji.reading && (
                        <p className="text-[11px] text-muted-foreground font-japanese mt-1">{activeKanji.reading}</p>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => setActiveKanji(null)}>
                      Đóng
                    </Button>
                  </div>
                  {activeKanji.meanings && <p className="text-xs leading-snug">{activeKanji.meanings}</p>}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {activeKanji.strokes != null && (
                      <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{activeKanji.strokes} nét</span>
                    )}
                    {activeKanji.radical && (
                      <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-japanese">Bộ {activeKanji.radical}</span>
                    )}
                  </div>
                  {activeKanji.words && activeKanji.words.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{activeKanji.words.length} từ liên quan</p>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5 gap-1" onClick={() => setKanjiAddOpen(true)}>
                          <BookmarkPlus className="w-3 h-3" /> Thêm tất cả
                        </Button>
                      </div>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {activeKanji.words.map((w) => (
                          <div key={w.id} className="text-[11px] rounded bg-muted/40 p-1.5">
                            <p className="font-japanese font-semibold">
                              {w.word}{' '}
                              <span className="text-muted-foreground font-normal">{w.reading}</span>
                            </p>
                            <p className="text-muted-foreground line-clamp-2">{w.meaning}</p>
                          </div>
                        ))}
                      </div>
                      <AddToDeckDialog
                        open={kanjiAddOpen}
                        onOpenChange={setKanjiAddOpen}
                        words={activeKanji.words}
                        title={`Thêm ${activeKanji.words.length} từ chứa "${activeKanji.kanji}"`}
                      />
                    </div>
                  )}
                </div>
              )}
              {!kanjiLoading && !activeKanji && kanjiResults.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {kanjiResults.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setActiveKanji(k)}
                      className="rounded-md border bg-card p-2 text-center hover:border-primary/60 transition-colors"
                    >
                      <p className="text-2xl font-bold font-japanese leading-tight">{k.kanji}</p>
                      {k.reading && (
                        <p className="text-[9px] text-muted-foreground font-japanese truncate mt-0.5">{k.reading}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {!kanjiLoading && !activeKanji && kanjiResults.length === 0 && (
                <div className="py-8 flex flex-col items-center text-muted-foreground gap-2 text-center">
                  <Sparkles className="w-6 h-6 opacity-40" />
                  <p className="text-xs leading-snug">Tra cứu kanji theo Hán-Việt hoặc nhập trực tiếp một kanji.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
