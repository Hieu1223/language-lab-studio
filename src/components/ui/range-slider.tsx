import * as React from 'react';
import { cn } from '@/lib/utils';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (v: [number, number]) => void;
  className?: string;
  /** Visual color of the active range. Tailwind bg-* class. */
  rangeClassName?: string;
  disabled?: boolean;
}

/**
 * 2-thumb range slider that ONLY responds to dragging a circular thumb with
 * primary (left) mouse / touch. Clicks on the track are intentionally ignored
 * to avoid accidental jumps.
 */
export const RangeSlider = React.forwardRef<HTMLDivElement, RangeSliderProps>(
  (
    {
      min,
      max,
      step = 1,
      value,
      onValueChange,
      className,
      rangeClassName = 'bg-primary',
      disabled,
    },
    ref,
  ) => {
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const draggingRef = React.useRef<null | 0 | 1>(null);

    const [lo, hi] = value;
    const span = Math.max(1, max - min);
    const loPct = ((lo - min) / span) * 100;
    const hiPct = ((hi - min) / span) * 100;

    const snap = React.useCallback(
      (raw: number) => {
        const clamped = Math.min(max, Math.max(min, raw));
        const snapped = Math.round((clamped - min) / step) * step + min;
        return Math.min(max, Math.max(min, snapped));
      },
      [min, max, step],
    );

    const moveTo = React.useCallback(
      (clientX: number) => {
        const which = draggingRef.current;
        if (which === null) return;
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect) return;
        const ratio = (clientX - rect.left) / rect.width;
        const next = snap(min + ratio * span);
        const [a, b] = value;
        if (which === 0) {
          const newLo = Math.min(next, b);
          if (newLo !== a) onValueChange([newLo, b]);
        } else {
          const newHi = Math.max(next, a);
          if (newHi !== b) onValueChange([a, newHi]);
        }
      },
      [snap, min, span, value, onValueChange],
    );

    React.useEffect(() => {
      const onMove = (e: PointerEvent) => {
        if (draggingRef.current === null) return;
        e.preventDefault();
        moveTo(e.clientX);
      };
      const onUp = () => {
        draggingRef.current = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      return () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
    }, [moveTo]);

    const startDrag = (which: 0 | 1) => (e: React.PointerEvent) => {
      // Only primary (left) mouse button. Touch and pen always allowed.
      if (disabled) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = which;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onKey = (which: 0 | 1) => (e: React.KeyboardEvent) => {
      if (disabled) return;
      const inc = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : null;
      const dec = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : null;
      const delta = inc ?? dec;
      if (delta == null) return;
      e.preventDefault();
      const [a, b] = value;
      if (which === 0) {
        const newLo = snap(a + delta);
        onValueChange([Math.min(newLo, b), b]);
      } else {
        const newHi = snap(b + delta);
        onValueChange([a, Math.max(newHi, a)]);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full select-none touch-none py-2',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
      >
        {/* Track (visual only — no pointer events) */}
        <div
          ref={trackRef}
          className="relative h-2 w-full rounded-full bg-secondary pointer-events-none"
        >
          <div
            className={cn('absolute h-full rounded-full', rangeClassName)}
            style={{ left: `${loPct}%`, width: `${Math.max(0, hiPct - loPct)}%` }}
          />
        </div>

        {/* Thumbs (only these accept pointer) */}
        {([0, 1] as const).map((which) => {
          const pct = which === 0 ? loPct : hiPct;
          return (
            <div
              key={which}
              role="slider"
              tabIndex={0}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={which === 0 ? lo : hi}
              onPointerDown={startDrag(which)}
              onKeyDown={onKey(which)}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                'absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-sm cursor-grab active:cursor-grabbing',
                'transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              )}
              style={{ left: `${pct}%`, touchAction: 'none' }}
            />
          );
        })}
      </div>
    );
  },
);
RangeSlider.displayName = 'RangeSlider';
