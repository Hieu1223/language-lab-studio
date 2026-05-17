import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseResizableSplitOptions {
  /** Initial split in percent (of container width) for the first pane. */
  initialPercent?: number;
  minPercent?: number;
  maxPercent?: number;
  /** localStorage key to persist split. */
  storageKey?: string;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Returns a container ref + current split percent + drag handle props for a
 * resizable two-pane split layout.
 */
export function useResizableSplit({
  initialPercent = 50,
  minPercent = 20,
  maxPercent = 80,
  storageKey,
  orientation = 'horizontal',
}: UseResizableSplitOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [percent, setPercent] = useState<number>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const v = parseFloat(saved);
        if (!isNaN(v)) return Math.min(maxPercent, Math.max(minPercent, v));
      }
    }
    return initialPercent;
  });
  const [dragging, setDragging] = useState(false);

  // Persist
  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, String(percent));
  }, [percent, storageKey]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => {
      const c = containerRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      let p: number;
      if (orientation === 'horizontal') {
        p = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        p = ((e.clientY - rect.top) / rect.height) * 100;
      }
      setPercent(Math.min(maxPercent, Math.max(minPercent, p)));
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging, orientation, minPercent, maxPercent]);

  return {
    containerRef,
    percent,
    setPercent,
    dragging,
    dragHandleProps: {
      onPointerDown,
    },
  };
}
