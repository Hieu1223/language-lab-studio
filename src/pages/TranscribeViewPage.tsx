import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { TranscriptViewerWithCloze } from '@/components/transcription/TranscriptViewerWithCloze';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  getTranscriptInfo,
  getTranscriptData,
  type TranscriptSegment as TranscriptSegmentType,
  type TranscriptInfo,
} from '@/lib/api/transcription-real';
import {
  generateClozes,
  regenerateClozes,
  revealAllClozes,
  hideAllClozes,
  type ClozeOptions,
  type ClozeSegment,
} from '@/lib/cloze-generator';

export default function TranscribeViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [transcriptInfo, setTranscriptInfo] = useState<TranscriptInfo | null>(null);
  const [segments, setSegments] = useState<TranscriptSegmentType[]>([]);
  const [clozeSegments, setClozeSegments] = useState<ClozeSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Cloze settings
  const [clozeOptions, setClozeOptions] = useState<ClozeOptions>({
    minGaps: 2,
    maxGaps: 5,
    minChars: 2,
    maxChars: 5,
  });
  const [showCloze, setShowCloze] = useState(false);
  const [showAllClozes, setShowAllClozes] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hoveredClozeId, setHoveredClozeId] = useState<string | null>(null);

  // Split panel resizing
  const [splitRatio, setSplitRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Right panel
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Load transcript data
  useEffect(() => {
    if (!id) {
      navigate('/youtube');
      return;
    }

    const loadTranscript = async () => {
      try {
        setLoading(true);
        const info = await getTranscriptInfo(id);
        const data = await getTranscriptData(id);

        if (!info || !data) {
          toast.error('Transcript not found');
          navigate('/youtube');
          return;
        }

        setTranscriptInfo(info);
        setSegments(data.segments);

        // Generate initial clozes
        const fullText = data.segments.map((s) => s.text).join(' ');
        const generated = generateClozes(fullText, clozeOptions);
        setClozeSegments(generated);
      } catch (error) {
        toast.error('Failed to load transcript');
        console.error(error);
        navigate('/youtube');
      } finally {
        setLoading(false);
      }
    };

    loadTranscript();
  }, [id, navigate]);

  // Handle mouse move for split panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;

      if (newRatio > 20 && newRatio < 80) {
        setSplitRatio(newRatio);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleRegenerateClozes = () => {
    const newClozes = regenerateClozes(clozeSegments, clozeOptions);
    setClozeSegments(newClozes);
    setShowAllClozes(false);
  };

  const handleToggleAllClozes = () => {
    if (showAllClozes) {
      setClozeSegments(hideAllClozes(clozeSegments));
    } else {
      setClozeSegments(revealAllClozes(clozeSegments));
    }
    setShowAllClozes(!showAllClozes);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transcriptInfo || segments.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Transcript not available</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg text-foreground">
            {transcriptInfo.original_source}
          </h1>
          <p className="text-sm text-muted-foreground">
            Phiên dịch và ôn tập
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/youtube')}>
          ← Back
        </Button>
      </div>

      {/* Main Content */}
      <div
        ref={containerRef}
        className="flex-1 flex overflow-hidden gap-4 p-4"
      >
        {/* Video Panel */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="flex flex-col min-w-0 bg-black rounded-lg overflow-hidden"
        >
          <VideoPlayer
            url={transcriptInfo.resource_url}
            onTimeUpdate={setCurrentTime}
          />
        </div>

        {/* Resizer */}
        <div
          onMouseDown={() => setIsDragging(true)}
          className="w-1 bg-border hover:bg-primary cursor-col-resize transition-colors"
        />

        {/* Transcript Panel */}
        <div
          style={{ width: `${100 - splitRatio}%` }}
          className="flex flex-col min-w-0"
        >
          <div className="flex-1 overflow-y-auto bg-card rounded-lg p-4 border border-border">
            <TranscriptViewerWithCloze
              segments={segments}
              clozeSegments={showCloze ? clozeSegments : undefined}
              showCloze={showCloze}
              currentTime={currentTime}
              autoScroll={autoScroll}
              hoveredClozeId={hoveredClozeId}
              onClozeHover={setHoveredClozeId}
              onWordClick={(timestamp) => {
                // This would control the video player
              }}
              onSegmentLoop={() => {
                // This would loop the segment
              }}
            />
          </div>
        </div>

        {/* Right Panel Toggle */}
        <button
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-primary text-primary-foreground rounded-l-lg p-2 hover:bg-primary/90"
        >
          {rightPanelOpen ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Right Panel */}
        {rightPanelOpen && (
          <div className="w-64 bg-card border border-border rounded-lg p-4 overflow-y-auto flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-2">
                Cloze Settings
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showCloze}
                    onChange={(e) => setShowCloze(e.target.checked)}
                    className="rounded"
                  />
                  <span>Enable Cloze</span>
                </label>

                {showCloze && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Min Gaps: {clozeOptions.minGaps}
                      </label>
                      <Slider
                        value={[clozeOptions.minGaps]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(v) =>
                          setClozeOptions({
                            ...clozeOptions,
                            minGaps: v[0],
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Max Gaps: {clozeOptions.maxGaps}
                      </label>
                      <Slider
                        value={[clozeOptions.maxGaps]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(v) =>
                          setClozeOptions({
                            ...clozeOptions,
                            maxGaps: v[0],
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Min Chars: {clozeOptions.minChars}
                      </label>
                      <Slider
                        value={[clozeOptions.minChars]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(v) =>
                          setClozeOptions({
                            ...clozeOptions,
                            minChars: v[0],
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">
                        Max Chars: {clozeOptions.maxChars}
                      </label>
                      <Slider
                        value={[clozeOptions.maxChars]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(v) =>
                          setClozeOptions({
                            ...clozeOptions,
                            maxChars: v[0],
                          })
                        }
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleRegenerateClozes}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        Regenerate
                      </Button>
                      <Button
                        onClick={handleToggleAllClozes}
                        size="sm"
                        className="flex-1"
                      >
                        {showAllClozes ? 'Hide All' : 'Reveal All'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded"
                />
                <span>Auto Scroll</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
