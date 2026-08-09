import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, BookOpen, Loader2 } from 'lucide-react';
import type { Token } from '@/lib/api/dictionary';
import { lookupQueryFor } from '@/lib/api/dictionary';
import { useLookup } from '@/hooks/useLookup';
import { AddToDeckDialog } from './AddToDeckDialog';

interface TokenPopoverProps {
  token: Token;
  /** Trigger element wrapping the surface text. */
  children: React.ReactNode;
}

/**
 * Click a token → popover with reading, dictionary form and meaning.
 *
 * The tokenizer does not return definitions, so the entry is fetched on demand
 * the first time the popover opens (doc §5.6).
 */
export function TokenPopover({ token, children }: TokenPopoverProps) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { results, loading, error, lookup } = useLookup();

  const query = lookupQueryFor(token);

  useEffect(() => {
    if (open && query) void lookup(query);
  }, [open, query, lookup]);

  const entry = results[0] ?? null;

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
                <span className="text-muted-foreground">Dạng từ điển:</span>{' '}
                <span className="font-medium font-japanese">{token.dictionary_form}</span>
              </p>
            )}

            <div className="border-t pt-2">
              {loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang tra cứu...
                </div>
              ) : error ? (
                <p className="text-xs text-destructive py-1">{error}</p>
              ) : entry ? (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-medium font-japanese">{entry.word}</p>
                    {entry.reading && (
                      <p className="text-xs text-muted-foreground font-japanese">
                        {entry.reading}
                      </p>
                    )}
                    <p className="text-sm leading-snug">{entry.meaning}</p>
                  </div>

                  {results.length > 1 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      +{results.length - 1} nghĩa khác
                    </p>
                  )}

                  <Button
                    size="sm"
                    className="w-full mt-3 gap-1.5"
                    onClick={() => {
                      setOpen(false);
                      setAddOpen(true);
                    }}
                    data-testid="token-save-to-deck-btn"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Lưu vào bộ
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Không có trong từ điển
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {entry && (
        <AddToDeckDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          words={[entry]}
          title={`Thêm "${entry.word}" vào bộ`}
        />
      )}
    </>
  );
}
