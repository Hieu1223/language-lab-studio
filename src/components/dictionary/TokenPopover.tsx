import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, BookOpen } from 'lucide-react';
import type { Token, WordEntry } from '@/lib/api/tokenization';
import { AddToDeckDialog } from './AddToDeckDialog';

interface TokenPopoverProps {
  token: Token;
  /** trigger element wraps the surface text */
  children: React.ReactNode;
}

/**
 * Click a token → popover with reading, dictionary form, meaning,
 * and a "save to deck" action that uses `entry.id` (uuid4).
 */
export function TokenPopover({ token, children }: TokenPopoverProps) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const entry: WordEntry | null = token.entry;
  const hasEntry = !!entry;

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
                <p className="text-lg font-bold leading-tight font-japanese">
                  {token.surface}
                </p>
                {token.reading && token.reading !== token.surface && (
                  <p className="text-xs text-muted-foreground font-japanese">
                    {token.reading}
                  </p>
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
              {hasEntry ? (
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

      {hasEntry && (
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
