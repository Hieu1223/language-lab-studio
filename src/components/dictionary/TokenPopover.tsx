import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, BookOpen, Loader2 } from 'lucide-react';
import type { Token } from '@/lib/api/dictionary';
import { lookupQueryFor } from '@/lib/api/dictionary';
import { useLookup } from '@/common/DictionaryLookupOverlay/useLookup';
import { AddToDeckDialog } from './AddToDeckDialog';
import type { WordLookupEntry } from '@/lib/api/dictionary';

interface TokenPopoverProps {
  token: Token;
  children: React.ReactNode;
}

export function TokenPopover({ token, children }: TokenPopoverProps) {
  const { t } = useTranslation('dictionary');
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pickedWord, setPickedWord] = useState<WordLookupEntry | null>(null);
  const { results, loading, error, lookup } = useLookup();

  const query = lookupQueryFor(token);

  useEffect(() => {
    if (open && query) void lookup(query);
  }, [open, query, lookup]);

  const hasMultiple = results.length > 1;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-72 p-3"
          data-testid="token-popover"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight font-japanese">{token.surface}</p>
                {token.reading && token.reading !== token.surface && (
                  <p className="text-xs text-muted-foreground font-japanese">{token.reading}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1 justify-end shrink-0">
                {token.pos.slice(0, 2).map((p, i) => (
                  <span
                    key={i}
                    className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {token.dictionary_form && token.dictionary_form !== token.surface && (
              <p className="text-xs">
                <span className="text-muted-foreground">{t('token.dictionaryForm')}</span>{' '}
                <span className="font-medium font-japanese">{token.dictionary_form}</span>
              </p>
            )}

            <div className="border-t pt-2">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('token.lookingUp')}
                </div>
              ) : error ? (
                <p className="text-xs text-destructive py-1">{error}</p>
              ) : results.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  {t('token.notInDictionary')}
                </div>
              ) : hasMultiple ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {results.map((w, i) => (
                    <HoverEntryCard
                      key={`${w.id}-${i}`}
                      word={w}
                      onAdd={() => {
                        setPickedWord(w);
                        setAddOpen(true);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <DetailedEntry entry={results[0]} />
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => {
                      setPickedWord(results[0]);
                      setAddOpen(true);
                    }}
                    data-testid="token-save-to-deck-btn"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    {t('token.saveToDeck')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {pickedWord && (
        <AddToDeckDialog
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o);
            if (!o) setPickedWord(null);
          }}
          words={[pickedWord]}
          title={t('token.addToDeckTitle', { word: pickedWord.word })}
        />
      )}
    </>
  );
}

interface HoverEntryCardProps {
  word: WordLookupEntry;
  onAdd: () => void;
}

function HoverEntryCard({ word, onAdd }: HoverEntryCardProps) {
  return (
    <div className="relative rounded-md border bg-card p-2 group cursor-pointer">
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold font-japanese leading-tight">{word.word}</p>
              {word.reading && word.reading !== word.word && (
                <p className="text-[10px] text-muted-foreground font-japanese truncate">
                  {word.reading}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onAdd}
            >
              <BookmarkPlus className="w-3 h-3" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-48 p-2 text-xs z-50"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DetailedEntry entry={word} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DetailedEntryProps {
  entry: WordLookupEntry;
}

function DetailedEntry({ entry }: DetailedEntryProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium font-japanese">{entry.word}</p>
      {entry.reading && entry.reading !== entry.word && (
        <p className="text-xs text-muted-foreground font-japanese">{entry.reading}</p>
      )}
      <p className="text-xs leading-snug">{entry.meaning}</p>
    </div>
  );
}
