import { useEffect, useMemo, useState } from 'react';
import { Loader2, ListChecks, BookmarkPlus, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  isLookupCandidate,
  lookupQueryFor,
  lookupWord,
  tokenize,
  type Token,
  type WordLookupEntry,
} from '@/lib/api/dictionary';
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
 * Click → TokenPopover. With `showControls`, tokens can be multi-selected and
 * bulk-added to a deck.
 *
 * The tokenizer returns no definitions, so selected tokens are resolved
 * against `/tokenization/dictionary/words/lookup` at add time; tokens with no
 * dictionary match are reported and skipped.
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
  const [resolving, setResolving] = useState(false);
  const [resolvedWords, setResolvedWords] = useState<WordLookupEntry[]>([]);

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
        setSelected(new Set());
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

  /** Indices of tokens worth looking up (skips punctuation/whitespace). */
  const lookupIndices = useMemo(
    () => tokens.map((t, i) => ({ token: t, idx: i })).filter(({ token }) => isLookupCandidate(token)),
    [tokens],
  );

  const allSelected =
    lookupIndices.length > 0 && lookupIndices.every(({ idx }) => selected.has(idx));

  const toggle = (idx: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(lookupIndices.map((t) => t.idx)));
  };

  /** Resolve the chosen tokens to dictionary entries, then open the dialog. */
  const openAddDialog = async (indices: number[]) => {
    if (indices.length === 0) return;
    setResolving(true);
    try {
      const queries = Array.from(
        new Set(
          indices
            .map((i) => tokens[i])
            .filter((t): t is Token => !!t)
            .map(lookupQueryFor)
            .filter(Boolean),
        ),
      );

      const settled = await Promise.all(
        queries.map(async (q) => {
          try {
            const res = await lookupWord(q, 1);
            return res.results?.[0] ?? null;
          } catch {
            return null;
          }
        }),
      );

      const found = settled.filter((e): e is WordLookupEntry => !!e);
      const missing = queries.length - found.length;

      if (found.length === 0) {
        toast.error('Không tìm thấy từ nào trong từ điển');
        return;
      }
      if (missing > 0) toast.warning(`Bỏ qua ${missing} từ không có trong từ điển`);

      setResolvedWords(found);
      setAddOpen(true);
    } finally {
      setResolving(false);
    }
  };

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
      {showControls && lookupIndices.length > 0 && (
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
            {selected.size} / {lookupIndices.length} từ đã chọn
          </span>
          <Button
            size="sm"
            className="gap-1.5 h-8"
            disabled={selected.size === 0 || resolving}
            onClick={() => void openAddDialog(Array.from(selected))}
            data-testid="add-selected-tokens-btn"
          >
            {resolving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5" />
            )}
            Thêm đã chọn ({selected.size})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 h-8"
            disabled={lookupIndices.length === 0 || resolving}
            onClick={() => void openAddDialog(lookupIndices.map((t) => t.idx))}
            data-testid="add-all-tokens-btn"
          >
            <ListChecks className="w-3.5 h-3.5" />
            Thêm toàn bộ ({lookupIndices.length})
          </Button>
        </div>
      )}

      <p
        className={`flex flex-wrap items-baseline leading-loose font-japanese ${textSize}`}
        data-testid="tokenized-sentence"
      >
        {tokens.map((t, i) => {
          const lookupable = isLookupCandidate(t);
          const isSelected = selected.has(i);
          const cls = lookupable
            ? `cursor-pointer underline decoration-dotted underline-offset-4 decoration-primary/60 hover:decoration-primary hover:bg-primary/10 rounded px-0.5 transition-colors ${
                isSelected ? 'bg-primary/20 decoration-primary' : ''
              }`
            : 'text-muted-foreground/80';

          if (!lookupable) {
            return (
              <span key={i} className={cls}>
                {t.surface}
              </span>
            );
          }

          return (
            <TokenPopover key={i} token={t}>
              <span
                className={cls}
                onClick={(e) => {
                  if (e.shiftKey && showControls) {
                    e.preventDefault();
                    toggle(i);
                  }
                }}
                data-testid={`token-${i}`}
                data-token-idx={i}
              >
                {t.surface}
              </span>
            </TokenPopover>
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
          if (!o) {
            setSelected(new Set());
            setResolvedWords([]);
          }
        }}
        words={resolvedWords}
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
  readOnly = false,
}: {
  initialText: string;
  onClose?: () => void;
  /** When true, the textarea cannot be edited (e.g. opened from manga / transcription). */
  readOnly?: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [activeText, setActiveText] = useState(initialText);
  const [retokenizing, setRetokenizing] = useState(false);

  // When the parent updates `initialText` (e.g. user selected a different
  // OCR block in the manga reader) we must reflect that in the read-only
  // textarea immediately.
  useEffect(() => {
    setText(initialText);
    setActiveText(initialText);
  }, [initialText]);

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
          onChange={(e) => {
            if (readOnly) return;
            setText(e.target.value);
          }}
          placeholder={readOnly ? '' : 'Nhập câu tiếng Nhật...'}
          rows={3}
          readOnly={readOnly}
          aria-readonly={readOnly}
          onKeyDown={(e) => {
            if (!readOnly) return;
            // Allow only navigation / copy shortcuts when read-only.
            const k = e.key;
            const isCopy =
              (e.ctrlKey || e.metaKey) && (k === 'c' || k === 'C' || k === 'a' || k === 'A');
            const isNav = [
              'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
              'Home', 'End', 'PageUp', 'PageDown', 'Tab', 'Shift', 'Control', 'Meta', 'Alt',
            ].includes(k);
            if (!isCopy && !isNav) e.preventDefault();
          }}
          onPaste={(e) => {
            if (readOnly) e.preventDefault();
          }}
          onDrop={(e) => {
            if (readOnly) e.preventDefault();
          }}
          className={`w-full bg-transparent resize-none focus:outline-none font-japanese text-base select-text ${
            readOnly ? 'cursor-default text-foreground/90' : ''
          }`}
          data-testid="sentence-input-textarea"
        />
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground">
            {readOnly
              ? `${text.length} ký tự · Chỉ đọc — chọn để sao chép`
              : `${text.length} ký tự`}
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
