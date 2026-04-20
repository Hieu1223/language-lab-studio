import React from 'react';
import { useResizableSplit } from '@/hooks/useResizableSplit';

interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialPercent?: number;
  minPercent?: number;
  maxPercent?: number;
  storageKey?: string;
  className?: string;
}

/**
 * Horizontal two-pane resizable split.
 * Drag the vertical handle between left and right to resize.
 */
export function ResizableSplit({
  left,
  right,
  initialPercent = 50,
  minPercent = 20,
  maxPercent = 80,
  storageKey,
  className = '',
}: ResizableSplitProps) {
  const { containerRef, percent, dragging, dragHandleProps } = useResizableSplit({
    initialPercent,
    minPercent,
    maxPercent,
    storageKey,
  });

  return (
    <div
      ref={containerRef}
      className={`relative flex w-full h-full min-h-0 min-w-0 ${className}`}
      style={{ userSelect: dragging ? 'none' : undefined }}
    >
      <div
        className="min-w-0 min-h-0 overflow-hidden flex flex-col"
        style={{ width: `${percent}%` }}
      >
        {left}
      </div>

      {/* Drag handle */}
      <div
        {...dragHandleProps}
        role="separator"
        aria-orientation="vertical"
        className={`group relative w-1.5 cursor-col-resize bg-border hover:bg-primary/60 transition-colors ${
          dragging ? 'bg-primary' : ''
        }`}
        style={{ touchAction: 'none' }}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary-foreground/80" />
      </div>

      <div
        className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col"
      >
        {right}
      </div>
    </div>
  );
}
