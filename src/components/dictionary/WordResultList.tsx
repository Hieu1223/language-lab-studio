import { BookmarkPlus, BookOpen, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { WordLookupEntry } from '@/lib/api/dictionary';

export interface WordResultListProps {
  results: WordLookupEntry[];
  loading?: boolean;
  error?: string | null;
  /** Called when the user picks one entry to save into a deck. */
  onAdd: (word: WordLookupEntry) => void;
  className?: string;
  /** Optional footer action, e.g. "add all". */
  footer?: React.ReactNode;
}

/**
 * Shared renderer for dictionary lookup results.
 *
 * Every lookup surface in the app (token popovers, overlays, reader panels)
 * shows the FULL list of matching entries — never an implicitly chosen first
 * result — and each row can be saved to a deck individually.
 */
export function WordResultList({
  results,
  loading = false,
  error = null,
  onAdd,
  className,
  footer,
}: WordResultListProps) {
  const { t } = useTranslation('dictionary');

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t('token.lookingUp')}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive py-1">{error}</p>;
  }

  if (results.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <BookOpen className="w-3.5 h-3.5" />
        {t('token.notInDictionary')}
      </div>
    );
  }

  return (
    <div className={className ?? 'space-y-2'}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {t('search.resultCount', { count: results.length })}
      </p>
      <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {results.map((w, i) => (
          <li
            key={`${w.id}-${i}`}
            className="rounded-md border bg-card p-2 flex items-start justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold font-japanese leading-tight break-words">
                {w.word}
                {w.reading && w.reading !== w.word && (
                  <span className="ml-1.5 text-[11px] font-normal text-muted-foreground font-japanese">
                    {w.reading}
                  </span>
                )}
              </p>
              <p className="text-xs leading-snug mt-0.5 break-words">{w.meaning}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-primary"
              title={t('token.saveToDeck')}
              aria-label={t('token.saveToDeck')}
              onClick={() => onAdd(w)}
              data-testid="lookup-result-add-btn"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}

export default WordResultList;
