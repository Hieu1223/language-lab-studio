import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, X, Repeat, MousePointer } from 'lucide-react';
import type { TranscriptSegment } from '@/lib/api/transcription';

interface SentenceSelectorProps {
  /** All transcript segments */
  segments: TranscriptSegment[];
  /** Current playback time */
  currentTime: number;
  /** Function to seek to a specific time */
  onSeek: (time: number) => void;
  /** Currently active segment index */
  activeSegmentIndex: number;
}

export function SentenceSelector({
  segments,
  currentTime,
  onSeek,
  activeSegmentIndex,
}: SentenceSelectorProps) {
  const [selectorActive, setSelectorActive] = useState(false);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const [beginWordIndex, setBeginWordIndex] = useState<number | null>(null);
  const [endWordIndex, setEndWordIndex] = useState<number | null>(null);
  const [looping, setLooping] = useState(false);
  const [clickToPlace, setClickToPlace] = useState<'begin' | 'end' | null>(null);
  const loopTimeoutRef = useRef<number | null>(null);

  // Get selected segment
  const selectedSegment = selectedSegmentIndex !== null ? segments[selectedSegmentIndex] : null;

  // Loop effect
  useEffect(() => {
    if (!looping || !selectedSegment || beginWordIndex === null || endWordIndex === null) {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      return;
    }

    const words = selectedSegment.words;
    const beginWord = words[beginWordIndex];
    const endWord = words[endWordIndex];

    if (!beginWord || !endWord || beginWord.start === null || endWord.end === null) {
      return;
    }

    const loopStart = beginWord.start;
    const loopEnd = endWord.end;

    // Check if we've passed the end - seek back to start
    if (currentTime >= loopEnd) {
      onSeek(loopStart);
    }

    return () => {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [currentTime, looping, beginWordIndex, endWordIndex, selectedSegment, onSeek]);

  const handleActivateSelector = () => {
    setSelectorActive(true);
    // Auto-select current active segment if available
    if (activeSegmentIndex >= 0) {
      setSelectedSegmentIndex(activeSegmentIndex);
    }
  };

  const handleDeactivateSelector = () => {
    setSelectorActive(false);
    setSelectedSegmentIndex(null);
    setBeginWordIndex(null);
    setEndWordIndex(null);
    setLooping(false);
    setClickToPlace(null);
  };

  const handleSelectSegment = (index: number) => {
    setSelectedSegmentIndex(index);
    setBeginWordIndex(null);
    setEndWordIndex(null);
    setLooping(false);
    setClickToPlace('begin');
  };

  const handleWordClick = (wordIndex: number) => {
    if (!selectorActive || selectedSegment === null) return;

    if (clickToPlace === 'begin') {
      setBeginWordIndex(wordIndex);
      setClickToPlace('end');
    } else if (clickToPlace === 'end') {
      // Ensure end is after begin
      if (beginWordIndex !== null && wordIndex < beginWordIndex) {
        setEndWordIndex(beginWordIndex);
        setBeginWordIndex(wordIndex);
      } else {
        setEndWordIndex(wordIndex);
      }
      setClickToPlace(null);
      // Auto-start looping
      const words = selectedSegment.words;
      const startWord = words[beginWordIndex!];
      if (startWord?.start !== null) {
        setLooping(true);
        onSeek(startWord.start);
      }
    }
  };

  const toggleLoop = () => {
    if (looping) {
      setLooping(false);
    } else if (beginWordIndex !== null && endWordIndex !== null && selectedSegment) {
      setLooping(true);
      const word = selectedSegment.words[beginWordIndex];
      if (word?.start !== null) onSeek(word.start);
    }
  };

  const getWordStyle = (wordIndex: number) => {
    if (beginWordIndex === wordIndex) {
      return 'bg-green-500/30 border-2 border-green-500 font-bold';
    }
    if (endWordIndex === wordIndex) {
      return 'bg-red-500/30 border-2 border-red-500 font-bold';
    }
    if (
      beginWordIndex !== null &&
      endWordIndex !== null &&
      wordIndex > beginWordIndex &&
      wordIndex < endWordIndex
    ) {
      return 'bg-blue-500/20';
    }
    return '';
  };

  const getSegmentText = (segment: TranscriptSegment) => {
    return segment.text || segment.words.map(w => w.token).join('');
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {!selectorActive ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleActivateSelector}
            className="gap-2"
          >
            <MousePointer className="w-4 h-4" />
            Bật chọn câu để lặp
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeactivateSelector}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Tắt
            </Button>

            {selectedSegmentIndex === null && (
              <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md font-medium">
                Chọn một câu bên dưới
              </span>
            )}

            {selectedSegmentIndex !== null && clickToPlace === 'begin' && (
              <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-md font-medium">
                Click từ để đặt điểm BẮT ĐẦU
              </span>
            )}

            {selectedSegmentIndex !== null && clickToPlace === 'end' && (
              <span className="text-xs bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-1 rounded-md font-medium">
                Click từ để đặt điểm KẾT THÚC
              </span>
            )}

            {selectedSegmentIndex !== null && beginWordIndex !== null && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setClickToPlace('begin');
                  setBeginWordIndex(null);
                  setEndWordIndex(null);
                  setLooping(false);
                }}
                className="gap-1 border-green-500 text-green-700 dark:text-green-400"
              >
                Đặt lại Bắt đầu
              </Button>
            )}

            {selectedSegmentIndex !== null && endWordIndex !== null && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setClickToPlace('end');
                  setEndWordIndex(null);
                  setLooping(false);
                }}
                className="gap-1 border-red-500 text-red-700 dark:text-red-400"
              >
                Đặt lại Kết thúc
              </Button>
            )}

            {beginWordIndex !== null && endWordIndex !== null && (
              <Button
                size="sm"
                variant={looping ? 'default' : 'outline'}
                onClick={toggleLoop}
                className="gap-2"
              >
                {looping ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Dừng lặp
                  </>
                ) : (
                  <>
                    <Repeat className="w-4 h-4" />
                    Bắt đầu lặp
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Segment selection list */}
      {selectorActive && selectedSegmentIndex === null && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Chọn câu:</p>
          {segments.map((segment, i) => {
            const text = getSegmentText(segment);
            const isActive = i === activeSegmentIndex;
            return (
              <button
                key={i}
                onClick={() => handleSelectSegment(i)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 bg-card'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-muted-foreground mt-0.5">
                    #{i + 1}
                  </span>
                  <p className="text-sm flex-1 line-clamp-2">{text}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Word selection for chosen segment */}
      {selectorActive && selectedSegmentIndex !== null && selectedSegment && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">
              Câu #{selectedSegmentIndex + 1}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedSegmentIndex(null);
                setBeginWordIndex(null);
                setEndWordIndex(null);
                setLooping(false);
                setClickToPlace(null);
              }}
              className="h-6 text-xs"
            >
              Chọn câu khác
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 p-3 bg-muted/30 rounded-lg border">
            {selectedSegment.words.map((word, i) => {
              const hasTimestamp = word.start !== null && word.end !== null;
              return (
                <button
                  key={i}
                  onClick={() => hasTimestamp && handleWordClick(i)}
                  disabled={!hasTimestamp}
                  className={`px-2 py-1 rounded text-sm transition-colors ${
                    hasTimestamp
                      ? `cursor-pointer hover:bg-primary/10 ${getWordStyle(i)}`
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  {word.token}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loop status */}
      {looping && selectedSegment && beginWordIndex !== null && endWordIndex !== null && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-blue-500 animate-spin" style={{ animationDuration: '2s' }} />
            <span className="text-blue-700 dark:text-blue-400 font-medium">
              Đang lặp câu #{selectedSegmentIndex! + 1} từ "{selectedSegment.words[beginWordIndex]?.token}" 
              đến "{selectedSegment.words[endWordIndex]?.token}"
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
