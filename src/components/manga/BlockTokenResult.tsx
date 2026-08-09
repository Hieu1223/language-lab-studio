import { TokenPopover } from '@/components/dictionary/TokenPopover';
import type { Token } from '@/lib/api/dictionary';

export interface BlockTokenResultProps {
  tokens: Token[];
}

/**
 * Compact token flow sized for the 288px reader drawer.
 *
 * Tokens wrap naturally so there is no horizontal overflow. Each token is
 * clickable: `TokenPopover` fetches its dictionary entry on demand (the
 * tokenizer returns no embedded definition, per doc §5.6) and offers a
 * "save to deck" action.
 */
export function BlockTokenResult({ tokens }: BlockTokenResultProps) {
  return (
    <div
      className="space-y-2 min-w-0"
      style={{
        fontFamily: '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
        wordBreak: 'break-all',
        overflowWrap: 'anywhere',
      }}
    >
      <p className="text-sm leading-relaxed font-japanese text-foreground/90">
        {tokens.map((t, i) => (
          <TokenPopover key={i} token={t}>
            <button
              type="button"
              className="hover:bg-primary/15 hover:decoration-primary rounded-sm px-px transition-colors"
            >
              {t.surface}
            </button>
          </TokenPopover>
        ))}
      </p>
    </div>
  );
}

export default BlockTokenResult;
