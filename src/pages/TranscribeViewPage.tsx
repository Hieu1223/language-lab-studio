import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transcribeVideo } from '@/lib/api/youtube';
import type { TranscriptSegment, TokenTimestamp } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, EyeOff, Repeat, Play, Pause } from 'lucide-react';

export default function TranscribeViewPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clozeMode, setClozeMode] = useState(false);
  const [clozeIndices, setClozeIndices] = useState<Set<string>>(new Set());
  const [loopSegmentIdx, setLoopSegmentIdx] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    transcribeVideo(videoId).then(result => {
      setSegments(result.segments);
      setLoading(false);
      // Generate random cloze indices
      const indices = new Set<string>();
      result.segments.forEach((seg, si) => {
        seg.words.forEach((_, wi) => {
          if (Math.random() < 0.25) indices.add(`${si}-${wi}`);
        });
      });
      setClozeIndices(indices);
    });
  }, [videoId]);

  const play = useCallback(() => {
    setIsPlaying(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1;
        return next;
      });
    }, 100);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Loop logic
  useEffect(() => {
    if (loopSegmentIdx === null || segments.length === 0) return;
    const seg = segments[loopSegmentIdx];
    const segEnd = seg.words[seg.words.length - 1]?.end ?? 0;
    const segStart = seg.words[0]?.start ?? 0;
    if (currentTime > segEnd + 0.5) {
      setCurrentTime(segStart);
    }
  }, [currentTime, loopSegmentIdx, segments]);

  // Auto-scroll
  useEffect(() => {
    const activeEl = document.querySelector('.active-token');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const jumpTo = (time: number | null) => {
    if (time !== null) {
      setCurrentTime(time);
      if (!isPlaying) play();
    }
  };

  const isTokenActive = (word: TokenTimestamp) => {
    if (word.start === null || word.end === null) return false;
    return currentTime >= word.start && currentTime < word.end + 0.15;
  };

  if (loading) return (
    <div className="p-6 text-center">
      <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">Đang phiên dịch video...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground gap-1">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Button>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => isPlaying ? pause() : play()} className="gap-1.5 rounded-xl">
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'Dừng' : 'Phát'}
        </Button>
        <Button
          variant={clozeMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setClozeMode(!clozeMode)}
          className="gap-1.5 rounded-xl"
        >
          {clozeMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          Cloze
        </Button>
        {loopSegmentIdx !== null && (
          <Button variant="destructive" size="sm" onClick={() => setLoopSegmentIdx(null)} className="gap-1.5 rounded-xl">
            <Repeat className="w-4 h-4" /> Bỏ lặp
          </Button>
        )}
        <span className="text-xs font-mono text-muted-foreground ml-auto">
          {currentTime.toFixed(1)}s
        </span>
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="space-y-4">
        {segments.map((seg, si) => (
          <div
            key={si}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              loopSegmentIdx === si
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/30'
            }`}
            onClick={() => setLoopSegmentIdx(loopSegmentIdx === si ? null : si)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-muted-foreground">
                {(seg.words[0]?.start ?? 0).toFixed(1)}s
              </span>
              {loopSegmentIdx === si && (
                <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
                  <Repeat className="w-3 h-3 inline mr-1" />Đang lặp
                </span>
              )}
            </div>
            <p className="text-lg leading-relaxed">
              {seg.words.map((word, wi) => {
                const active = isTokenActive(word);
                const hidden = clozeMode && clozeIndices.has(`${si}-${wi}`);
                return (
                  <span
                    key={wi}
                    className={`token ${active ? 'active-token' : ''} ${hidden ? 'cloze-hidden' : ''}`}
                    onClick={e => { e.stopPropagation(); jumpTo(word.start); }}
                  >
                    {word.token}
                  </span>
                );
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
