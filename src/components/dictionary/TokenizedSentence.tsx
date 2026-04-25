import { useEffect, useState } from 'react';
import { Loader2, ListChecks, BookmarkPlus, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokenize, type Token, type WordEntry } from '@/lib/api/tokenization';
import { TokenPopover } from './TokenPopover';
import { AddToDeckDialog } from './AddToDeckDialog';
import { toast } from 'sonner';

interface TokenizedSentenceProps {
  /** Either pass `text` to auto-tokenize, or pre-fetched `tokens`. */
  text?: string;
  tokens?: Token[];
  /** Optional className for the wrapping <p> */
  className?: string;
  /** Show selection / bulk-add controls */
  showControls?: boolean;
  /** Compact rendering (smaller text) */
  compact?: boolean;
  /** Called after tokens are loaded (when using `text`) */
  onTokens?: (tokens: Token[]) => void;
}

/**
 * Renders a Japanese sentence with each token underlined and clickable.
 * Click → TokenPopover. If `showControls` is enabled, the user can also
 * select multiple tokens and bulk-add them to a deck (only ones with
 * dictionary entries can be saved).
 */
export function TokenizedSentence({
  text,
  tokens: tokensProp,
  className = '',
  showControls = false,
  compact = false,
  onTokens,
}: TokenizedSentenceProps) {
  const [tokens, setTokens] = useState<Token[]>(tokensProp ?? []);
  const [loading, setLoading] = useState(!tokensProp && !!text);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (tokensProp) {
      setTokens(tokensProp);
      setLoading(false);
      return;
    }
    if (!text || !text.trim()) {
      setTokens([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await tokenize(text);
        if (cancelled) return;
        setTokens(res.tokens);
        onTokens?.(res.tokens);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Tokenize thất bại');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, tokensProp]);

  const tokensWithEntry = tokens
    .map((t, i) => ({ token: t, idx: i }))
    .filter(({ token }) => !!token.entry);

  const allSelected =
    tokensWithEntry.length > 0 &&
    tokensWithEntry.every(({ idx }) => selected.has(idx));

  const toggle = (idx: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(tokensWithEntry.map((t) => t.idx)));
  };

  const selectedEntries: WordEntry[] = Array.from(selected)
    .map((i) => tokens[i]?.entry)
    .filter((e): e is WordEntry => !!e);

  const allEntries: WordEntry[] = tokensWithEntry
    .map(({ token }) => token.entry!)
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang phân tích câu...
      </div>
    );
  }

  if (error) {
    return (
      <p className={`text-sm text-red-500 ${className}`}>Lỗi tokenize: {error}</p>
    );
  }

  if (tokens.length === 0) return null;

  const textSize = compact ? 'text-base' : 'text-lg';

  return (
    <div className={`space-y-3 ${className}`}>
      {showControls && tokensWithEntry.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="gap-1.5 h-8"
            data-testid="select-all-tokens-btn"
          >
            {allSelected ? (
              <CheckSquare className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Button>
          <span className="text-muted-foreground">
            {selected.size} / {tokensWithEntry.length} từ có nghĩa
          </span>
          <Button
            size="sm"
            className="gap-1.5 h-8"
            disabled={selected.size === 0}
            onClick={() => setAddOpen(true)}
            data-testid="add-selected-tokens-btn"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Thêm đã chọn ({selected.size})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 h-8"
            disabled={allEntries.length === 0}
            onClick={() => {
              setSelected(new Set(tokensWithEntry.map((t) => t.idx)));
              setAddOpen(true);
            }}
            data-testid="add-all-tokens-btn"
          >
            <ListChecks className="w-3.5 h-3.5" />
            Thêm toàn bộ ({allEntries.length})
          </Button>
        </div>
      )}

      <p
        className={`flex flex-wrap items-baseline leading-loose font-japanese ${textSize}`}
        data-testid="tokenized-sentence"
      >
        {tokens.map((t, i) => {
          const hasEntry = !!t.entry;
          const isSelected = selected.has(i);
          const cls = hasEntry
            ? `cursor-pointer underline decoration-dotted underline-offset-4 decoration-primary/60 hover:decoration-primary hover:bg-primary/10 rounded px-0.5 transition-colors ${
                isSelected ? 'bg-primary/20 decoration-primary' : ''
              }`
            : 'text-muted-foreground/80';

          const inner = (
            <span
              className={cls}
              onClick={(e) => {
                if (!hasEntry) return;
                if (e.shiftKey && showControls) {
                  e.preventDefault();
                  toggle(i);
                }
              }}
              data-testid={hasEntry ? `token-${i}` : undefined}
              data-token-idx={i}
            >
              {t.surface}
            </span>
          );

          // Tokens with entry get a popover, others render plain
          return hasEntry ? (
            <TokenPopover key={i} token={t}>
              {inner}
            </TokenPopover>
          ) : (
            <span key={i} className={cls}>
              {t.surface}
            </span>
          );
        })}
      </p>

      {showControls && (
        <p className="text-[10px] text-muted-foreground italic">
          Mẹo: nhấp để xem nghĩa, Shift+click để chọn nhiều từ.
        </p>
      )}

      <AddToDeckDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setSelected(new Set());
        }}
        words={selected.size > 0 ? selectedEntries : allEntries}
      />
    </div>
  );
}

/**
 * Standalone component: takes a sentence string and tokenizes it, with full controls.
 * Used by Tokenization page and the sentence-tokenize popups in Transcript / Manga.
 */
export function TokenizeSentencePanel({
  initialText,
  onClose,
}: {
  initialText: string;
  onClose?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [activeText, setActiveText] = useState(initialText);
  const [retokenizing, setRetokenizing] = useState(false);

  const handleRetokenize = () => {
    setRetokenizing(true);
    setActiveText(text);
    setTimeout(() => setRetokenizing(false), 50);
    if (!text.trim()) toast.error('Câu trống');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập câu tiếng Nhật..."
          rows={3}
          className="w-full bg-transparent resize-none focus:outline-none font-japanese text-base"
          data-testid="sentence-input-textarea"
        />
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground">
            {text.length} ký tự
          </p>
          <div className="flex gap-2">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Đóng
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleRetokenize}
              disabled={!text.trim() || retokenizing}
              data-testid="tokenize-btn"
            >
              Phân tích
            </Button>
          </div>
        </div>
      </div>

      {!retokenizing && activeText.trim() && (
        <TokenizedSentence text={activeText} showControls />
      )}
    </div>
  );
}
