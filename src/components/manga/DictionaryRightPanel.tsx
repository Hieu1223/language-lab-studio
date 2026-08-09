import { BookmarkPlus, Loader2, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLookup } from '@/common/DictionaryLookupOverlay/useLookup';
import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WordLookupEntry } from '@/lib/api/dictionary';

/** Dictionary search tab shown in the manga reader's right-hand panel. */
export function DictionaryRightPanel() {
  const { t } = useTranslation('manga');
  const { loading, error, results, lookup } = useLookup(30);
  const [q, setQ] = useState('');
  const [pickedWord, setPickedWord] = useState<WordLookupEntry | null>(null);
  const [wordAddOpen, setWordAddOpen] = useState(false);

  const doWordSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await lookup(q);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <form onSubmit={doWordSearch} className="p-3 flex gap-1.5 border-b border-border flex-shrink-0">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('dict.searchPlaceholder')}
          className="h-8 text-xs"
        />
        <Button type="submit" size="icon" className="h-8 w-8" disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </Button>
      </form>

      {error && (
        <p className="px-3 pt-2 text-xs text-destructive" data-testid="manga-lookup-error">{error}</p>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {results.length === 0 && !loading && (
            <div className="py-8 flex flex-col items-center text-muted-foreground gap-2 text-center">
              <Sparkles className="w-6 h-6 opacity-40" />
              <p className="text-xs leading-snug">{t('dict.hint')}</p>
            </div>
          )}
          {results.map((w) => (
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
                  title={t('dict.saveToDeck')}
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
    </div>
  );
}

export default DictionaryRightPanel;
