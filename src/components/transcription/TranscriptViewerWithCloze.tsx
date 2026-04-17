import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ClozeSegment } from '@/lib/cloze-generator';

interface TranscriptSegment {
  text: string;
  words: Array<{ token: string; start?: number; end?: number }>;
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  clozeSegments?: ClozeSegment[];
  showCloze?: boolean;
  onWordClick?: (timestamp: number) => void;
  onSegmentLoop?: (segmentIndex: number) => void;
  autoScroll?: boolean;
  currentTime?: number;
  hoveredClozeId?: string;
  onClozeHover?: (id: string | null) => void;
}

export function TranscriptViewerWithCloze({
  segments,
  clozeSegments,
  showCloze = false,
  onWordClick,
  onSegmentLoop,
  autoScroll = true,
  currentTime = 0,
  hoveredClozeId,
  onClozeHover,
}: TranscriptViewerProps) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  // Auto-scroll to active segment
  if (autoScroll && currentTime !== undefined) {
    let newIndex = 0;
    for (let i = 0; i < segments.length; i++) {
      const segmentStart = segments[i].words[0]?.start || 0;
      if (segmentStart <= currentTime) {
        newIndex = i;
      } else {
        break;
      }
    }
    if (newIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(newIndex);
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 select-text">
      {segments.map((segment, segIdx) => {
        const isActive = Math.abs(segIdx - activeSegmentIndex) <= 1;
        const segmentStart = segment.words[0]?.start || 0;

        return (
          <div
            key={segIdx}
            className={`p-4 rounded-lg border-2 transition-all ${
              isActive
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Text Content */}
              <p className="flex-1 text-base leading-relaxed flex flex-wrap gap-1">
                  {segment.words.map((word, wordIdx) => {
                    const clozeId = `seg-${segIdx}-word-${wordIdx}`;
                    const isCloze =
                      showCloze && clozeSegments?.some((cs) => cs.id === clozeId);
                    const isHovered = hoveredClozeId === clozeId;

                    return (
                      <Tooltip key={wordIdx}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              if (word.start !== undefined) {
                                onWordClick?.(word.start);
                              }
                            }}
                            onMouseEnter={() => onClozeHover?.(clozeId)}
                            onMouseLeave={() => onClozeHover?.(null)}
                            className={`px-1.5 py-0.5 rounded transition-all ${
                              isCloze
                                ? `${
                                    isHovered
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground font-bold'
                                  }`
                                : 'hover:bg-primary/10 text-foreground'
                            }`}
                          >
                            {isCloze && !isHovered
                              ? '●●●'
                              : word.token || word}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Click to jump to {Math.floor(word.start || 0)}s
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
              </p>

              {/* Loop Button */}
              <button
                onClick={() => onSegmentLoop?.(segIdx)}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Loop this segment"
              >
                ↻
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </TooltipProvider>
  );
}
