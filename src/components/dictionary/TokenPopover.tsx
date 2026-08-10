import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Token, WordLookupEntry } from '@/lib/api/dictionary';
import { lookupQueryFor } from '@/lib/api/dictionary';
import { useLookup } from '@/common/DictionaryLookupOverlay/useLookup';
import { AddToDeckDialog } from './AddToDeckDialog';
import { WordResultList } from './WordResultList';

interface TokenPopoverProps {
  token: Token;
  children: React.ReactNode;
}

/**
 * Popover shown when a tokenized word is clicked.
 *
 * The dictionary lookup always renders the full list of matching entries so the
 * user picks the right sense themselves; any entry can be saved to a deck.
 */
export function TokenPopover({ token, children }: TokenPopoverProps) {
  const { t } = useTranslation('dictionary');
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pickedWord, setPickedWord] = useState<WordLookupEntry | null>(null);
  const { results, loading, error, lookup } = useLookup(30);

  const query = lookupQueryFor(token);

  useEffect(() => {
    if (open && query) void lookup(query);
  }, [open, query, lookup]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-[min(22rem,calc(100vw-2rem))] p-3"
          collisionPadding={12}
          data-testid="token-popover"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight font-japanese break-words">
                  {token.surface}
                </p>
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
              <WordResultList
                results={results}
                loading={loading}
                error={error}
                onAdd={(w) => {
                  setPickedWord(w);
                  setAddOpen(true);
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AddToDeckDialog
        open={addOpen && !!pickedWord}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setPickedWord(null);
        }}
        words={pickedWord ? [pickedWord] : []}
        title={pickedWord ? t('token.addToDeckTitle', { word: pickedWord.word }) : undefined}
      />
    </>
  );
}

export default TokenPopover;
