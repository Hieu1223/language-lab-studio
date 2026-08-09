import { useEffect, useRef, useState } from 'react';

export interface ResizableDrawerProps {
  children: React.ReactNode;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 360;
const STORAGE_KEY = 'viewer-drawer-width';

/**
 * Right-hand drawer with a draggable left edge (desktop viewer layout).
 * The chosen width is persisted to localStorage across sessions.
 */
export function ResizableDrawer({ children }: ResizableDrawerProps) {
  const [width, setWidth] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem(STORAGE_KEY) || '', 10);
    return !isNaN(saved) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, saved)) : DEFAULT_WIDTH;
  });
  const draggingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const next = window.innerWidth - e.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
    };
    const onUp = () => {
      draggingRef.current = false;
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
  }, []);

  return (
    <aside
      className="flex-shrink-0 border-l border-border h-full relative"
      style={{ width }}
    >
      {/* Resize handle on the left edge of the drawer */}
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={(e) => {
          if (e.button !== 0 && e.pointerType === 'mouse') return;
          e.preventDefault();
          draggingRef.current = true;
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'col-resize';
        }}
        className="absolute -left-1 top-0 bottom-0 w-2 z-30 cursor-col-resize hover:bg-primary/40 transition-colors"
        style={{ touchAction: 'none' }}
      />
      <div className="h-full">{children}</div>
    </aside>
  );
}

export default ResizableDrawer;
