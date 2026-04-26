import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SentenceTokenizeDialog } from '@/components/dictionary/SentenceTokenizeDialog';
import type { ClozeSegment, ClozeToken } from '@/lib/cloze-block';

/**
 * A single cloze "word" inside the transcript. Behaviours:
 *  - Click  → seek the video to its start timestamp.
 *  - Hover  → reveal the cloze (without persisting). Leaving hides it again.
 *  - In Read mode (cloze off) the word is rendered plainly.
 */
export function TranscriptClozeWord({
  ct,
  isCurrent,
  showClozeMode,
  onSeek,
}: {
  ct: ClozeToken;
  isCurrent: boolean;
  showClozeMode: boolean;
  onSeek?: (seconds: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { word, isCloze, revealed } = ct;

  const base =
    'inline-block rounded px-1 mx-0.5 transition-all duration-150 select-none whitespace-pre cursor-pointer';
  const active = isCurrent
    ? 'bg-yellow-400/30 text-yellow-100 ring-1 ring-yellow-400/50'
    : '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (word.start != null) onSeek?.(word.start);
  };

  // If we are in Read mode OR this token is not a cloze → just show normally
  if (!showClozeMode || !isCloze) {
    return (
      <span
        onClick={handleClick}
        className={`${base} ${active} hover:bg-white/10`}
        title={word.start != null ? `→ ${word.start.toFixed(1)}s` : undefined}
      >
        {word.token}
      </span>
    );
  }

  // Cloze + revealed (toggled or hovered) → show actual word
  const showWord = revealed || hovered;
  if (showWord) {
    return (
      <span
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`${base} ${
          revealed
            ? 'bg-green-500/20 text-green-300 border border-green-500/40'
            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
        } ${active}`}
        title={word.start != null ? `→ ${word.start.toFixed(1)}s` : undefined}
      >
        {word.token}
      </span>
    );
  }

  // Hidden cloze (mouse not over) → blanks
  const cleanLen = word.token.trim().replace(/[^\p{L}\p{N}]/gu, '').length;
  const blanks = '_'.repeat(Math.max(cleanLen, 2));

  return (
    <span
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${base} bg-primary/30 text-transparent border-b-2 border-primary hover:bg-primary/50 font-mono tracking-widest ${active}`}
      title={word.start != null ? `→ ${word.start.toFixed(1)}s` : undefined}
    >
      {blanks}
    </span>
  );
}

/**
 * One transcript segment row with all words + a "tokenize sentence"
 * button. The transcript is character/word level; the API tokenize
 * endpoint will give us full word-level tokens for dictionary lookup.
 */
export function TranscriptSegmentRow({
  cs,
  isActive,
  showClozeMode,
  currentTime,
  onSeek,
  rowRef,
}: {
  cs: ClozeSegment;
  isActive: boolean;
  showClozeMode: boolean;
  currentTime: number;
  onSeek?: (seconds: number) => void;
  rowRef?: React.Ref<HTMLDivElement>;
}) {
  const [tokenizeOpen, setTokenizeOpen] = useState(false);

  // Reconstruct the plain-text sentence from tokens (preserves spacing)
  const sentence = cs.tokens.map((t) => t.word.token).join('');

  return (
    <div
      ref={rowRef}
      className={`group transition-all duration-300 p-4 rounded-xl border-l-4 relative ${
        isActive
          ? 'bg-primary/5 border-primary shadow-sm'
          : 'border-transparent opacity-70 hover:opacity-100'
      }`}
    >
      <p className="flex flex-wrap items-center leading-[2.2] text-base">
        {cs.tokens.map((ct, ti) => (
          <TranscriptClozeWord
            key={ti}
            ct={ct}
            showClozeMode={showClozeMode}
            isCurrent={
              isActive &&
              ct.word.start !== null &&
              ct.word.end !== null &&
              currentTime >= ct.word.start &&
              currentTime <= ct.word.end
            }
            onSeek={onSeek}
          />
        ))}
      </p>

      <Button
        size="icon"
        variant="ghost"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Phân tích câu này thành từ"
        onClick={(e) => {
          e.stopPropagation();
          setTokenizeOpen(true);
        }}
        data-testid="segment-tokenize-btn"
      >
        <Wand2 className="w-3.5 h-3.5 text-primary" />
      </Button>

      <SentenceTokenizeDialog
        open={tokenizeOpen}
        onOpenChange={setTokenizeOpen}
        text={sentence}
      />
    </div>
  );
}
