import { BookmarkPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddToDeckDialog } from '@/components/dictionary/AddToDeckDialog';
import { Button } from '@/components/ui/button';
import type { WordLookupEntry } from '@/lib/api/dictionary';

export interface WordCardProps {
  word: WordLookupEntry;
  index: number;
}

export function WordCard({ word, index }: WordCardProps) {
  const { t } = useTranslation('dictionary');
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className="rounded-xl border bg-card p-3 sm:p-4 hover:border-primary/40 transition-colors group"
        data-testid={`word-card-${index}`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold font-japanese leading-tight break-words">
              {word.word}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground font-japanese break-words">
              {word.reading}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 -mr-1 -mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity"
            onClick={() => setOpen(true)}
            data-testid={`word-save-btn-${index}`}
            title={t('deck.addToDeck')}
            aria-label={t('deck.addToDeck')}
          >
            <BookmarkPlus className="w-4 h-4 text-primary" />
          </Button>
        </div>
        <p className="text-sm leading-snug mt-2 break-words">{word.meaning}</p>
      </div>
      <AddToDeckDialog open={open} onOpenChange={setOpen} words={[word]} />
    </>
  );
}


export default WordCard;
