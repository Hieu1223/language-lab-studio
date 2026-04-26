import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, X, Repeat, MousePointer } from 'lucide-react';

interface SentenceSelectorProps {
  /** Array of word timestamps from the transcript */
  words: Array<{ token: string; start: number | null; end: number | null }>;
  /** Current playback time */
  currentTime: number;
  /** Function to seek to a specific time */
  onSeek: (time: number) => void;
  /** Whether the player is currently playing */
  isPlaying?: boolean;
}

export function SentenceSelector({
  words,
  currentTime,
  onSeek,
  isPlaying = false,
}: SentenceSelectorProps) {
  const [selectorActive, setSelectorActive] = useState(false);
  const [beginIndex, setBeginIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [looping, setLooping] = useState(false);
  const [clickToPlace, setClickToPlace] = useState<'begin' | 'end' | null>(null);
  const loopTimeoutRef = useRef<number | null>(null);

  // Words with valid timestamps
  const timedWords = words
    .map((w, i) => ({ ...w, index: i }))
    .filter((w) => w.start !== null && w.end !== null);

  // Loop effect
  useEffect(() => {
    if (!looping || beginIndex === null || endIndex === null) {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      return;
    }

    const beginWord = timedWords.find((w) => w.index === beginIndex);
    const endWord = timedWords.find((w) => w.index === endIndex);

    if (!beginWord || !endWord || beginWord.start === null || endWord.end === null) {
      return;
    }

    const loopStart = beginWord.start;
    const loopEnd = endWord.end;

    // Check if we've passed the end
    if (currentTime >= loopEnd) {
      // Seek back to start
      onSeek(loopStart);
    }

    return () => {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [currentTime, looping, beginIndex, endIndex, timedWords, onSeek]);

  const handleWordClick = (wordIndex: number) => {
    if (!selectorActive) return;

    if (clickToPlace === 'begin') {
      setBeginIndex(wordIndex);
      setClickToPlace(null);
      // Auto-start looping
      if (endIndex !== null && wordIndex <= endIndex) {
        setLooping(true);
        const word = timedWords.find((w) => w.index === wordIndex);
        if (word?.start !== null) onSeek(word.start);
      }
    } else if (clickToPlace === 'end') {
      setEndIndex(wordIndex);
      setClickToPlace(null);
      // Auto-start looping
      if (beginIndex !== null && wordIndex >= beginIndex) {
        setLooping(true);
        const word = timedWords.find((w) => w.index === beginIndex);
        if (word?.start !== null) onSeek(word.start);
      }
    }
  };

  const handleActivateSelector = () => {
    setSelectorActive(true);
    setClickToPlace('begin');
  };

  const handleDeactivateSelector = () => {
    setSelectorActive(false);
    setBeginIndex(null);
    setEndIndex(null);
    setLooping(false);
    setClickToPlace(null);
  };

  const toggleLoop = () => {
    if (looping) {
      setLooping(false);
    } else if (beginIndex !== null && endIndex !== null) {
      setLooping(true);
      const word = timedWords.find((w) => w.index === beginIndex);
      if (word?.start !== null) onSeek(word.start);
    }
  };

  const getWordStyle = (wordIndex: number) => {
    if (beginIndex === wordIndex) {
      return 'bg-green-500/30 border-2 border-green-500 font-bold';
    }
    if (endIndex === wordIndex) {
      return 'bg-red-500/30 border-2 border-red-500 font-bold';
    }
    if (
      beginIndex !== null &&
      endIndex !== null &&
      wordIndex > beginIndex &&
      wordIndex < endIndex
    ) {
      return 'bg-blue-500/20';
    }
    return '';
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
            Bật chọn câu
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

            {clickToPlace === 'begin' && (
              <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-md font-medium">
                Click vào từ để đặt điểm BẮT ĐẦU
              </span>
            )}

            {clickToPlace === 'end' && (
              <span className="text-xs bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-1 rounded-md font-medium">
                Click vào từ để đặt điểm KẾT THÚC
              </span>
            )}

            {beginIndex !== null && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setClickToPlace('begin');
                  setLooping(false);
                }}
                className="gap-1 border-green-500 text-green-700 dark:text-green-400"
              >
                Đặt lại Bắt đầu
              </Button>
            )}

            {endIndex !== null && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setClickToPlace('end');
                  setLooping(false);
                }}
                className="gap-1 border-red-500 text-red-700 dark:text-red-400"
              >
                Đặt lại Kết thúc
              </Button>
            )}

            {beginIndex !== null && endIndex !== null && (
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
                    Lặp lại
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Word display */}
      {selectorActive && (
        <div className="flex flex-wrap gap-1 p-3 bg-muted/30 rounded-lg border">
          {words.map((word, i) => {
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
      )}

      {looping && beginIndex !== null && endIndex !== null && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-blue-500 animate-spin" style={{ animationDuration: '2s' }} />
            <span className="text-blue-700 dark:text-blue-400 font-medium">
              Đang lặp từ "{words[beginIndex]?.token}" đến "{words[endIndex]?.token}"
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
