import type { ClozeToken } from '@/lib/cloze-word';

export interface ClozeWordProps {
  ct: ClozeToken;
  isCurrent: boolean;
  onToggle: () => void;
  showClozeMode: boolean;
}

/**
 * A single transcript word rendered as plain text, a hidden blank, or a
 * revealed answer depending on cloze state. Clicking a blank toggles reveal.
 */
export function ClozeWord({ ct, isCurrent, onToggle, showClozeMode }: ClozeWordProps) {
  const { word, isCloze, revealed } = ct;

  const base =
    'inline-block px-1 mx-0.5 rounded cursor-pointer select-none transition';

  const active = isCurrent ? 'bg-yellow-400/20' : '';

  if (!showClozeMode || !isCloze) {
    return <span className={`${base} ${active}`}>{word.token}</span>;
  }

  if (revealed) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`${base} ${active} bg-green-500/20 text-green-400`}
      >
        {word.token}
      </span>
    );
  }

  const len = Math.max(
    word.token.trim().replace(/[^a-zA-Z0-9]/g, '').length,
    2,
  );

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`${base} ${active} text-transparent border-b border-primary`}
    >
      {'_'.repeat(len)}
    </span>
  );
}

export default ClozeWord;
