import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { ChevronDown } from 'lucide-react';
import { TokenPopover } from '@/components/dictionary/TokenPopover';
import { depLinkToToken, isLookupCandidate, type DependencyLink, type DependencyTree } from '@/lib/api/dictionary';

export interface DependencyArcsProps {
  /** One parsed sentence (GiNZA dependency tree). */
  sentence: DependencyTree;
  /** Smaller typography for narrow panels (e.g. the manga reader drawer). */
  compact?: boolean;
}

interface Pos {
  center: number;
  left: number;
  right: number;
}

/**
 * Dependency arcs visualisation: tokens laid out on a single line with curved
 * arcs drawn from each token to its syntactic head, labelled with the relation.
 *
 * Positions are measured from the DOM (fonts/CJK widths vary), so the arcs
 * always line up with the real glyph boxes. The row scrolls horizontally
 * rather than wrapping, which keeps a single arc plane.
 */
export function DependencyArcs({ sentence, compact = false }: DependencyArcsProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [positions, setPositions] = useState<Pos[]>([]);

  const tokens = useMemo(() => sentence.tokens ?? [], [sentence.tokens]);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const base = wrap.getBoundingClientRect();
    const next = tokens.map((_, i) => {
      const el = tokenRefs.current[i];
      if (!el) return { center: 0, left: 0, right: 0 };
      const r = el.getBoundingClientRect();
      const left = r.left - base.left + wrap.scrollLeft;
      return { left, right: left + r.width, center: left + r.width / 2 };
    });
    setPositions(next);
  }, [tokens]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    const id = window.setTimeout(measure, 60); // after webfont swap
    return () => {
      ro.disconnect();
      window.clearTimeout(id);
    };
  }, [measure]);

  const arcs = tokens
    .map((tok, i) => ({ tok, i }))
    .filter(({ tok }) => tok.head_index != null && tok.head_index !== tok.token_index && !tok.is_root);

  const spanOf = (tok: DependencyLink, i: number) => Math.abs((tok.head_index ?? i) - i);
  const maxSpan = arcs.reduce((m, a) => Math.max(m, spanOf(a.tok, a.i)), 0);
  const step = compact ? 13 : 17;
  const arcAreaH = Math.max(compact ? 34 : 44, (maxSpan + 1) * step + 10);
  const svgW = positions.length ? Math.max(...positions.map((p) => p.right)) + 8 : 0;

  return (
    <div className="w-full overflow-x-auto" data-testid="dependency-arcs">
      <div ref={wrapRef} className="relative inline-block min-w-full px-1 pb-1">
        <svg
          width={svgW || '100%'}
          height={arcAreaH}
          className="block overflow-visible"
          aria-hidden="true"
        >
          {positions.length === tokens.length &&
            arcs.map(({ tok, i }) => {
              const from = positions[i];
              const to = positions[tok.head_index as number];
              if (!from || !to) return null;
              const h = arcAreaH - spanOf(tok, i) * step - 4;
              const y0 = arcAreaH;
              const midX = (from.center + to.center) / 2;
              const d = `M ${from.center} ${y0} C ${from.center} ${h}, ${to.center} ${h}, ${to.center} ${y0}`;
              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeOpacity={0.55}
                    strokeWidth={1.2}
                  />
                  <circle cx={to.center} cy={y0 - 2} r={2} fill="hsl(var(--primary))" fillOpacity={0.7} />
                  <text
                    x={midX}
                    y={h + (compact ? 8 : 10)}
                    textAnchor="middle"
                    fontSize={compact ? 8 : 9}
                    fill="hsl(var(--muted-foreground))"
                  >
                    {tok.dep}
                  </text>
                </g>
              );
            })}
        </svg>

        <div className={`flex items-start gap-1 whitespace-nowrap font-japanese ${compact ? 'text-sm' : 'text-base'}`}>
          {tokens.map((tok, i) => {
            const asToken = depLinkToToken(tok, sentence.sentence_id);
            const lookupable = isLookupCandidate(asToken);
            const node = (
              <span
                ref={(el) => { tokenRefs.current[i] = el; }}
                className={
                  lookupable
                    ? 'cursor-pointer underline decoration-dotted underline-offset-4 decoration-primary/60 hover:decoration-primary hover:bg-primary/10 rounded px-0.5 transition-colors'
                    : 'text-muted-foreground/80 px-0.5'
                }
                data-testid={`arc-token-${i}`}
              >
                {tok.surface}
              </span>
            );
            return (
              <span key={i} className="inline-flex flex-col items-center">
                {lookupable ? <TokenPopover token={asToken}>{node}</TokenPopover> : node}
                <span className="text-[8px] leading-tight text-muted-foreground/70 font-mono max-w-[6rem] truncate">
                  {tok.is_root ? 'ROOT' : tok.pos[0] ?? ''}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Renders every sentence of a parsed text as its own arc diagram. */
export function DependencyArcsList({
  sentences,
  compact = false,
  collapsible = false,
}: {
  sentences: DependencyTree[];
  compact?: boolean;
  /** Show sentence-sized segments first, expanding their arcs on click. */
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  if (!sentences.length) return null;

  if (collapsible) {
    return (
      <div className="space-y-2" data-testid="dependency-segments">
        {sentences.map((sentence, i) => {
          const isExpanded = expanded.has(i);
          return (
            <div key={`${sentence.sentence_id}-${i}`} className="overflow-hidden rounded-lg border bg-muted/30">
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-3 text-left font-japanese transition-colors ${
                  isExpanded ? 'bg-primary/10 text-foreground' : 'hover:bg-primary/5'
                }`}
                onClick={() => setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })}
                aria-expanded={isExpanded}
                data-testid={`dependency-segment-${i}`}
              >
                <span className="min-w-0 flex-1 text-base leading-relaxed">{sentence.text}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && (
                <div className="border-t px-2 py-2">
                  <DependencyArcs sentence={sentence} compact={compact} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sentences.map((s, i) => (
        <div key={`${s.sentence_id}-${i}`} className="rounded-lg border bg-muted/30 p-2">
          <DependencyArcs sentence={s} compact={compact} />
        </div>
      ))}
    </div>
  );
}

export default DependencyArcs;
