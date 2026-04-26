import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Play,
  Settings as SettingsIcon,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ResizableSplit } from '@/components/ResizableSplit';
import { SentenceSelector } from '@/components/transcription/SentenceSelector';
import {
  getTranscriptInfo,
  getTranscriptData,
  requestTranscription,
  findTranscriptByVideoId,
  isTranscriptError,
  isTranscriptReady,
  type TranscriptInfo,
  type TranscriptSegment,
  type VideoPreview,
} from '@/lib/api/transcription-real';
import { useAuth } from '@/lib/auth-context';
import {
  generateBlockCloze,
  type BlockClozeOptions,
  type ClozeSegment,
} from '@/lib/cloze-block';
import { TranscriptSegmentRow } from '@/components/transcription/TranscriptSegmentRow';

// ─── Config ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 60; // ~4 minutes

const DEFAULT_CLOZE_OPTS: BlockClozeOptions = {
  minHidden: 1,
  maxHidden: 3,
  minVisible: 2,
  maxVisible: 5,
  requireTimestamp: true,
};

type TranscriptStatus =
  | 'checking'
  | 'not_found'
  | 'processing'
  | 'ready'
  | 'error';

// ─── Main ────────────────────────────────────────────────────────────────

export default function YouTubeVideoViewerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Selected video metadata (from browse page sessionStorage, else minimal)
  const [video] = useState<VideoPreview | null>(() => {
    const raw = sessionStorage.getItem('selectedVideo');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Transcript state
  const [status, setStatus] = useState<TranscriptStatus>('checking');
  const [transcriptInfo, setTranscriptInfo] = useState<TranscriptInfo | null>(
    null,
  );
  const [rawSegments, setRawSegments] = useState<TranscriptSegment[]>([]);
  const [requesting, setRequesting] = useState(false);
  const pollAbortRef = useRef(false);

  // Playback & cloze
  const [currentTime, setCurrentTime] = useState(0);
  const [seed, setSeed] = useState(() => Date.now());
  const [clozeOpts, setClozeOpts] = useState<BlockClozeOptions>(DEFAULT_CLOZE_OPTS);
  const [showClozeMode, setShowClozeMode] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);
  const [clozeSegments, setClozeSegments] = useState<ClozeSegment[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectorExpanded, setSelectorExpanded] = useState(false);

  const activeSegRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<((seconds: number) => void) | null>(null);

  // ── Find transcript on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!videoId) return;
    pollAbortRef.current = false;

    (async () => {
      setStatus('checking');
      try {
        const info = await findTranscriptByVideoId(videoId);
        if (!info) {
          setStatus('not_found');
          return;
        }
        setTranscriptInfo(info);
        await loadTranscriptData(info.id, info.status);
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    })();

    return () => {
      pollAbortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const loadTranscriptData = useCallback(
    async (transcriptId: string, currentStatus?: number) => {
      // Per spec: only request /data when status === 3 (READY)
      if (currentStatus != null && isTranscriptError(currentStatus)) {
        setStatus('error');
        return;
      }
      if (currentStatus == null || !isTranscriptReady(currentStatus)) {
        setStatus('processing');
        startPolling(transcriptId);
        return;
      }
      try {
        const data = await getTranscriptData(transcriptId);
        if (data?.segments?.length) {
          setRawSegments(data.segments);
          setStatus('ready');
        } else {
          setStatus('processing');
          startPolling(transcriptId);
        }
      } catch {
        setStatus('processing');
        startPolling(transcriptId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const startPolling = useCallback((transcriptId: string) => {
    let attempts = 0;
    const tick = async () => {
      if (pollAbortRef.current) return;
      attempts++;
      try {
        const info = await getTranscriptInfo(transcriptId);
        if (info) {
          setTranscriptInfo(info);
          if (isTranscriptError(info.status)) {
            setStatus('error');
            return;
          }
          if (isTranscriptReady(info.status)) {
            const data = await getTranscriptData(transcriptId);
            if (data?.segments?.length) {
              setRawSegments(data.segments);
              setStatus('ready');
              return;
            }
          }
        }
      } catch {
        /* keep polling */
      }
      if (attempts >= POLL_MAX_ATTEMPTS) {
        toast.warning('Đang mất nhiều thời gian hơn dự kiến. Vui lòng thử lại sau.');
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    setTimeout(tick, POLL_INTERVAL_MS);
  }, []);

  // ── Regenerate cloze when rawSegments / opts / seed change ────────────────
  useEffect(() => {
    if (rawSegments.length === 0) {
      setClozeSegments([]);
      return;
    }
    const next = generateBlockCloze(rawSegments, clozeOpts, seed);
    setClozeSegments(next);
    setAllRevealed(false);
  }, [rawSegments, clozeOpts, seed]);

  // ── Active segment tracking ──────────────────────────────────────────────
  const activeSegIdx = useMemo(() => {
    return rawSegments.findIndex((seg) => {
      const timed = seg.words.filter((w) => w.start !== null);
      if (timed.length === 0) return false;
      return (
        currentTime >= (timed[0].start ?? 0) &&
        currentTime <= (timed[timed.length - 1].end ?? 0)
      );
    });
  }, [rawSegments, currentTime]);

  useEffect(() => {
    if (autoScroll && activeSegRef.current) {
      activeSegRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSegIdx, autoScroll]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleRequestTranscription = async () => {
    if (!user?.id || !videoId) {
      toast.error('Vui lòng đăng nhập.');
      return;
    }
    try {
      setRequesting(true);
      setStatus('processing');
      const res = await requestTranscription(
        `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        video?.title || 'YouTube Video',
        video?.thumbnail_url || '',
        user.id,
      );
      if (!res.success) {
        toast.error('Yêu cầu thất bại');
        setStatus('not_found');
        return;
      }
      toast.success('Đã yêu cầu phiên dịch, đang xử lý...');
      const info = await getTranscriptInfo(res.transcript_id).catch(() => null);
      if (info) setTranscriptInfo(info);
      startPolling(res.transcript_id);
    } catch (err) {
      console.error(err);
      toast.error('Không thể yêu cầu phiên dịch');
      setStatus('not_found');
    } finally {
      setRequesting(false);
    }
  };

  const handleSeek = useCallback((seconds: number) => {
    seekRef.current?.(seconds);
  }, []);

  const handleToggleAll = () => {
    const next = !allRevealed;
    setClozeSegments((prev) =>
      prev.map((s) => ({
        ...s,
        tokens: s.tokens.map((t) => (t.isCloze ? { ...t, revealed: next } : t)),
      })),
    );
    setAllRevealed(next);
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const title = video?.title || transcriptInfo?.original_source || 'YouTube Video';

  const leftPane = (
    <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-background">
      <div className="rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        <VideoPlayer
          url={`https://www.youtube.com/watch?v=${videoId}`}
          onTimeUpdate={setCurrentTime}
          seekRef={seekRef}
        />
      </div>
      <div className="bg-card border rounded-2xl p-4 text-sm flex-1 min-h-0 overflow-y-auto">
        <h3 className="text-xs font-bold mb-2 text-primary uppercase tracking-wider">
          Thông tin video
        </h3>
        <p className="font-semibold mb-1 line-clamp-3">{title}</p>
        {video?.channel?.name && (
          <p className="text-xs text-muted-foreground mb-2">{video.channel.name}</p>
        )}
        {video?.description && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
            {video.description}
          </p>
        )}
      </div>
    </div>
  );

  const rightPane = (
    <div className="flex flex-col h-full min-h-0 bg-card border-l">
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          Transcript
        </span>
        <div className="flex items-center gap-2">
          {status === 'ready' && (
            <>
              <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3 h-3 accent-primary"
                />
                Auto-scroll
              </label>
              <div className="flex bg-muted p-0.5 rounded">
                <button
                  onClick={() => setShowClozeMode(true)}
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    showClozeMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Study
                </button>
                <button
                  onClick={() => setShowClozeMode(false)}
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    !showClozeMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Read
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSettingsOpen((v) => !v)}
                title="Cloze settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {status === 'checking' && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Đang kiểm tra transcript...</p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 max-w-sm">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                Chưa có transcript
              </p>
              <p className="text-xs text-muted-foreground">
                Yêu cầu phiên dịch để tạo transcript với timestamp và luyện tập cloze tương tác.
              </p>
            </div>
            <Button
              onClick={handleRequestTranscription}
              disabled={requesting}
              size="lg"
              className="gap-2"
            >
              {requesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang yêu cầu...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Yêu cầu phiên dịch
                </>
              )}
            </Button>
          </div>
        )}

        {status === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground text-center px-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Đang xử lý transcript…</p>
            <p className="text-xs">Quá trình này có thể mất vài phút.</p>
          </div>
        )}

        {status === 'ready' && rawSegments.length > 0 && (
          <div className="space-y-6">
            {/* Sentence Selector */}
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Lặp lại câu
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectorExpanded(!selectorExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {selectorExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {selectorExpanded && activeSegIdx >= 0 && rawSegments[activeSegIdx] && (
                <SentenceSelector
                  words={rawSegments[activeSegIdx].words}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                />
              )}
              {selectorExpanded && activeSegIdx < 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Phát video để chọn câu
                </p>
              )}
            </div>

            {/* Transcript segments */}
            {clozeSegments.map((cs, si) => (
              <TranscriptSegmentRow
                key={si}
                cs={cs}
                isActive={si === activeSegIdx}
                showClozeMode={showClozeMode}
                currentTime={currentTime}
                onSeek={handleSeek}
                rowRef={si === activeSegIdx ? activeSegRef : undefined}
              />
            ))}
            <div className="h-32" />
          </div>
        )}

        {status === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <p className="text-sm">Đã xảy ra lỗi khi tải transcript.</p>
            <Button onClick={() => window.location.reload()}>Tải lại</Button>
          </div>
        )}
      </div>

      {/* Settings drawer (overlay) */}
      {settingsOpen && status === 'ready' && (
        <aside className="absolute right-0 top-0 h-full w-80 bg-card border-l p-5 flex flex-col gap-6 shadow-2xl z-30 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-primary" /> Cloze Settings
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSettingsOpen(false)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <ClozeRangeSliders opts={clozeOpts} setOpts={setClozeOpts} />

          <div className="grid grid-cols-1 gap-2 pt-2 border-t">
            <Button variant="outline" className="w-full justify-start h-9 gap-2" onClick={() => setSeed(Date.now())}>
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span className="text-xs">Tạo lại khối ẩn</span>
            </Button>
            <Button variant="outline" className="w-full justify-start h-9 gap-2" onClick={handleToggleAll}>
              {allRevealed ? (
                <EyeOff className="w-4 h-4 text-orange-500" />
              ) : (
                <Eye className="w-4 h-4 text-green-500" />
              )}
              <span className="text-xs">{allRevealed ? 'Ẩn tất cả' : 'Hiện tất cả'}</span>
            </Button>
          </div>

          <div className="mt-auto bg-primary/5 rounded-xl p-3 border border-primary/10">
            <h4 className="text-[10px] font-bold uppercase mb-1 text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Logic mới
            </h4>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Ẩn N token liên tiếp rồi hiện M token — cả N và M đều ngẫu nhiên trong khoảng min/max bạn cấu hình.
            </p>
          </div>
        </aside>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-sm truncate max-w-md">{title}</h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              YouTube Viewer
            </span>
          </div>
        </div>
      </header>

      {/* Resizable body */}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        <ResizableSplit
          left={leftPane}
          right={rightPane}
          storageKey="ytviewer-split"
          initialPercent={50}
          minPercent={25}
          maxPercent={75}
        />
      </main>
    </div>
  );
}

// ─── Cloze sliders ────────────────────────────────────────────────────────

function ClozeRangeSliders({
  opts,
  setOpts,
}: {
  opts: BlockClozeOptions;
  setOpts: React.Dispatch<React.SetStateAction<BlockClozeOptions>>;
}) {
  const update = (patch: Partial<BlockClozeOptions>) =>
    setOpts((prev) => {
      const next = { ...prev, ...patch };
      // Keep min <= max invariants
      if (next.minHidden > next.maxHidden) next.maxHidden = next.minHidden;
      if (next.minVisible > next.maxVisible) next.maxVisible = next.minVisible;
      return next;
    });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <label className="text-[11px] font-bold text-muted-foreground uppercase">
            Ẩn liên tiếp (min)
          </label>
          <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
            {opts.minHidden}
          </span>
        </div>
        <Slider
          value={[opts.minHidden]}
          min={1}
          max={10}
          step={1}
          onValueChange={([v]) => update({ minHidden: v })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <label className="text-[11px] font-bold text-muted-foreground uppercase">
            Ẩn liên tiếp (max)
          </label>
          <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
            {opts.maxHidden}
          </span>
        </div>
        <Slider
          value={[opts.maxHidden]}
          min={1}
          max={10}
          step={1}
          onValueChange={([v]) => update({ maxHidden: v })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <label className="text-[11px] font-bold text-muted-foreground uppercase">
            Hiện giữa (min)
          </label>
          <span className="text-xs font-mono bg-green-500/10 text-green-500 px-2 py-0.5 rounded">
            {opts.minVisible}
          </span>
        </div>
        <Slider
          value={[opts.minVisible]}
          min={0}
          max={15}
          step={1}
          onValueChange={([v]) => update({ minVisible: v })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <label className="text-[11px] font-bold text-muted-foreground uppercase">
            Hiện giữa (max)
          </label>
          <span className="text-xs font-mono bg-green-500/10 text-green-500 px-2 py-0.5 rounded">
            {opts.maxVisible}
          </span>
        </div>
        <Slider
          value={[opts.maxVisible]}
          min={0}
          max={15}
          step={1}
          onValueChange={([v]) => update({ maxVisible: v })}
        />
      </div>
    </div>
  );
}
