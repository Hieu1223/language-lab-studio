import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, BookOpen, Type, BookmarkPlus, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { WordLookupEntry } from '@/lib/api/dictionary';
import { useLookup } from '@/common/DictionaryLookupOverlay/useLookup';
import { AddToDeckDialog } from './AddToDeckDialog';
import { TokenizedSentence } from './TokenizedSentence';

/**
 * Reusable dictionary side panel with two modes:
 *  - "Từ vựng": single-word lookup via `/tokenization/dictionary/words/lookup`
 *  - "Câu": tokenize a passage and look up each token
 *
 * Both modes are explicit-submit; nothing fires per keystroke (§5.6).
 */
export function DictionaryPanel() {
  const { t } = useTranslation('dictionary');
  const [mode, setMode] = useState<'words' | 'sentence'>('words');

  const { results, loading, error, lookup } = useLookup(30);
  const [wordQ, setWordQ] = useState('');
  const [searched, setSearched] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pickedWord, setPickedWord] = useState<WordLookupEntry | null>(null);

  const [sentence, setSentence] = useState('');
  const [activeSentence, setActiveSentence] = useState('');

  const doWordSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = wordQ.trim();
    if (!q) return;
    setSearched(true);
    const found = await lookup(q);
    // No `panel.*` key carries this exact copy; `search.notFound` matches it.
    if (found.length === 0) toast.info(t('search.notFound'));
  };

  const submitSentence = (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = sentence.trim();
    if (!value) {
      toast.error(t('panel.emptySentence'));
      return;
    }
    setActiveSentence(value);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-border flex gap-1 flex-shrink-0">
        <button
          onClick={() => setMode('words')}
          className={`flex-1 text-xs h-7 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'words'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <BookOpen className="w-3 h-3" /> {t('panel.modeVocab')}
        </button>
        <button
          onClick={() => setMode('sentence')}
          className={`flex-1 text-xs h-7 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'sentence'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <Type className="w-3 h-3" /> {t('panel.modeSentence')}
        </button>
      </div>

      {mode === 'words' ? (
        <>
          <form
            onSubmit={doWordSearch}
            className="p-3 flex gap-1.5 border-b border-border flex-shrink-0"
          >
            <Input
              value={wordQ}
              onChange={(e) => setWordQ(e.target.value)}
              placeholder={t('panel.searchPlaceholder')}
              className="h-8 text-xs"
              data-testid="dict-panel-word-input"
            />
            <Button type="submit" size="icon" className="h-8 w-8" disabled={loading}>
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
            </Button>
          </form>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {error && <p className="text-xs text-destructive">{error}</p>}

              {!searched && !loading && (
                <div className="py-8 flex flex-col items-center text-muted-foreground gap-2 text-center">
                  <Sparkles className="w-6 h-6 opacity-40" />
                  <p className="text-xs leading-snug">
                    {t('panel.hint')}
                  </p>
                </div>
              )}

              {searched && !loading && !error && results.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  {t('panel.notFound')}
                </p>
              )}

              {results.map((w, i) => (
                <div
                  key={`${w.id}-${i}`}
                  className="rounded-md border bg-card p-2.5 hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold font-japanese leading-tight truncate">
                        {w.word}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-japanese truncate">
                        {w.reading}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 flex-shrink-0 opacity-60 group-hover:opacity-100"
                      title={t('panel.saveToDeck')}
                      onClick={() => {
                        setPickedWord(w);
                        setAddOpen(true);
                      }}
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
            open={addOpen}
            onOpenChange={(o) => {
              setAddOpen(o);
              if (!o) setPickedWord(null);
            }}
            words={pickedWord ? [pickedWord] : []}
          />
        </>
      ) : (
        <>
          <form onSubmit={submitSentence} className="p-3 space-y-2 border-b border-border flex-shrink-0">
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder={t('panel.sentencePlaceholder')}
              rows={3}
              className="w-full rounded-md border bg-background p-2 text-sm font-japanese resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="dict-panel-sentence-input"
            />
            <Button type="submit" size="sm" className="w-full h-8" disabled={!sentence.trim()}>
              {t('panel.analyze')}
            </Button>
          </form>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {activeSentence ? (
                <TokenizedSentence text={activeSentence} showControls compact />
              ) : (
                <div className="py-8 flex flex-col items-center text-muted-foreground gap-2 text-center">
                  <Sparkles className="w-6 h-6 opacity-40" />
                  <p className="text-xs leading-snug">
                    {t('panel.sentenceHint')}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
