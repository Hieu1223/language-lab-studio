import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Play,
  Settings as SettingsIcon,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  Repeat,
  BookOpen,
  X,
  Highlighter,
  Rows2,
  Columns2,
  Square,
  Layout as LayoutIcon,
  Check,
  Flag,
  FlagOff,
  SkipForward,
  Crosshair,
} from 'lucide-react';

import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { RangeSlider } from '@/components/ui/range-slider';
import { Switch } from '@/components/ui/switch';
import { ResizableSplit, VerticalResizableSplit } from '@/components/ResizableSplit';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { DictionaryPanel } from '@/components/dictionary/DictionaryPanel';
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
} from '@/lib/api/transcription';
import { useAuth } from '@/lib/auth-context';
import {
  generateBlockCloze,
  type BlockClozeOptions,
  type ClozeSegment,
} from '@/lib/cloze-block';
import {
  getTranscriptionSettings,
  setTranscriptionSettings,
  type TranscriptionSettings,
  type HighlightMode,
  type TranscriptionMode,
} from '@/lib/settings-storage';
import { TranscriptSegmentRow } from '@/components/transcription/TranscriptSegmentRow';

// ─── Config ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 60;

type PageStatus = 'checking' | 'not_found' | 'processing' | 'ready' | 'error';
type PanelTab = 'settings' | 'loop' | 'dictionary';

// ─── Resizable right drawer (desktop) ────────────────────────────────────

function ResizableDrawer({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem('viewer-drawer-width') || '', 10);
    return !isNaN(saved) ? Math.min(720, Math.max(280, saved)) : 360;
  });
  const draggingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('viewer-drawer-width', String(width));
  }, [width]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const next = window.innerWidth - e.clientX;
      setWidth(Math.min(720, Math.max(280, next)));
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

// ─── Main ────────────────────────────────────────────────────────────────

export default function YouTubeVideoViewerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

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
  const [status, setStatus] = useState<PageStatus>('checking');
  const [transcriptInfo, setTranscriptInfo] = useState<TranscriptInfo | null>(null);
  const [rawSegments, setRawSegments] = useState<TranscriptSegment[]>([]);
  const [requesting, setRequesting] = useState(false);
  const pollAbortRef = useRef(false);

  // ── Settings (persisted) ────────────────────────────────────────────────
  const [settings, setSettingsState] = useState<TranscriptionSettings>(() =>
    getTranscriptionSettings(),
  );
  const updateSettings = (patch: Partial<TranscriptionSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      setTranscriptionSettings(next);
      return next;
    });
  };

  // Draft cloze ranges — edits don't auto-apply; user must click Apply.
  const [draftHidden, setDraftHidden] = useState<[number, number]>(settings.hiddenRange);
  const [draftVisible, setDraftVisible] = useState<[number, number]>(settings.visibleRange);
  const clozeDirty =
    draftHidden[0] !== settings.hiddenRange[0] ||
    draftHidden[1] !== settings.hiddenRange[1] ||
    draftVisible[0] !== settings.visibleRange[0] ||
    draftVisible[1] !== settings.visibleRange[1];

  const clozeOpts: BlockClozeOptions = useMemo(
    () => ({
      minHidden: settings.hiddenRange[0],
      maxHidden: settings.hiddenRange[1],
      minVisible: settings.visibleRange[0],
      maxVisible: settings.visibleRange[1],
      requireTimestamp: true,
    }),
    [settings.hiddenRange, settings.visibleRange],
  );

  // Playback & cloze
  const [currentTime, setCurrentTime] = useState(0);
  const [seed, setSeed] = useState(() => Date.now());
  const [allRevealed, setAllRevealed] = useState(false);
  const [clozeSegments, setClozeSegments] = useState<ClozeSegment[]>([]);

  // Right drawer state
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>('settings');

  // ── Loop state — three modes ─────────────────────────────────────────────
  // 'range'   : loop between loopStart and loopEnd timestamps (token-level)
  // 'jump'    : single anchor; button jumps the player to it (no auto loop)
  // 'segment' : loop the entire active segment by index
  type LoopMode = 'range' | 'jump' | 'segment';
  const [loopMode, setLoopMode] = useState<LoopMode>('range');
  const [loopStart, setLoopStart] = useState<number | null>(null); // seconds
  const [loopEnd, setLoopEnd] = useState<number | null>(null);     // seconds
  const [loopSegmentIdx, setLoopSegmentIdx] = useState<number | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  // When non-null, the next token click sets the loop boundary instead of seeking.
  const [pickMode, setPickMode] = useState<'start' | 'end' | 'jump' | 'segment' | null>(null);

  const activeSegRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<((seconds: number) => void) | null>(null);

  // ── Segment loop mode state ──────────────────────────────────────────────
  const [segmentLoopStartIdx, setSegmentLoopStartIdx] = useState<number>(0);
  const segmentLoopEndIdx = Math.min(
    segmentLoopStartIdx + settings.segmentLoopCount - 1,
    rawSegments.length - 1,
  );

  // Calculate segment loop boundaries: include padding before first and after last
  const segmentLoopBounds = useMemo(() => {
    if (settings.transcriptionMode !== 'segment-loop' || rawSegments.length === 0) {
      return null;
    }
    const firstSeg = rawSegments[segmentLoopStartIdx];
    const lastSeg = rawSegments[segmentLoopEndIdx];
    if (!firstSeg || !lastSeg) return null;

    const firstWords = firstSeg.words.filter((w) => w.start !== null);
    const lastWords = lastSeg.words.filter((w) => w.start !== null);
    if (firstWords.length === 0 || lastWords.length === 0) return null;

    const loopStart = (firstWords[0].start ?? 0) - settings.segmentLoopPadding;
    const loopEnd = (lastWords[lastWords.length - 1].end ?? 0) + settings.segmentLoopPadding;
    const silentGapEnd = loopEnd + settings.segmentLoopGap;

    return { loopStart, loopEnd, silentGapEnd };
  }, [
    settings.transcriptionMode,
    settings.segmentLoopPadding,
    settings.segmentLoopGap,
    settings.segmentLoopCount,
    rawSegments,
    segmentLoopStartIdx,
    segmentLoopEndIdx,
  ]);

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
    if (settings.autoScroll && activeSegRef.current) {
      activeSegRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSegIdx, settings.autoScroll]);

  // ── Loop logic — three modes + segment-loop mode ─────────────────────────
  useEffect(() => {
    if (!loopEnabled) return;
    if (loopMode === 'range') {
      if (loopStart == null || loopEnd == null) return;
      if (currentTime >= loopEnd) seekRef.current?.(loopStart);
    } else if (loopMode === 'segment') {
      if (loopSegmentIdx == null) return;
      const seg = rawSegments[loopSegmentIdx];
      if (!seg) return;
      const timed = seg.words.filter((w) => w.start !== null);
      if (timed.length === 0) return;
      const segStart = timed[0].start ?? 0;
      const segEnd = timed[timed.length - 1].end ?? 0;
      if (currentTime >= segEnd || currentTime < segStart - 0.05) {
        seekRef.current?.(segStart);
      }
    }
  }, [currentTime, loopEnabled, loopMode, loopStart, loopEnd, loopSegmentIdx, rawSegments]);

  // ── Segment loop mode: auto-loop and auto-advance on next segment ────────
  useEffect(() => {
    if (settings.transcriptionMode !== 'segment-loop') return;
    if (!segmentLoopBounds) return;

    const { loopStart, loopEnd, silentGapEnd } = segmentLoopBounds;

    // When we reach the silent gap end (loop restart point), loop back
    if (currentTime >= silentGapEnd) {
      seekRef.current?.(loopStart);
    }
  }, [currentTime, settings.transcriptionMode, segmentLoopBounds]);

  const handleSetLoopStart = () => {
    setPickMode((m) => (m === 'start' ? null : 'start'));
    if (pickMode !== 'start') toast.info('Bấm vào một từ trong transcript để đặt điểm bắt đầu');
  };
  const handleSetLoopEnd = () => {
    setPickMode((m) => (m === 'end' ? null : 'end'));
    if (pickMode !== 'end') toast.info('Bấm vào một từ trong transcript để đặt điểm kết thúc');
  };
  const handleSetJumpAnchor = () => {
    setPickMode((m) => (m === 'jump' ? null : 'jump'));
    if (pickMode !== 'jump') toast.info('Bấm vào một từ để đặt điểm xuất phát');
  };
  const handleJumpNow = () => {
    if (loopStart == null) {
      toast.error('Chưa đặt điểm xuất phát');
      return;
    }
    seekRef.current?.(loopStart);
  };
  const handleSetLoopSegment = () => {
    setPickMode((m) => (m === 'segment' ? null : 'segment'));
    if (pickMode !== 'segment') toast.info('Bấm vào một từ trong câu muốn lặp');
  };

  const handleToggleLoop = () => {
    if (loopEnabled) {
      setLoopEnabled(false);
      setPickMode(null);
      return;
    }
    setLoopEnabled(true);
  };

  const applyClozeSettings = () => {
    updateSettings({ hiddenRange: draftHidden, visibleRange: draftVisible });
    setSeed(Date.now());
    toast.success('Đã áp dụng cài đặt mới');
  };

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
    if (pickMode === 'start') {
      setLoopStart(seconds);
      if (loopEnd != null && seconds >= loopEnd) setLoopEnd(null);
      setPickMode(null);
      toast.success(`Bắt đầu lặp ở ${seconds.toFixed(2)}s`);
      return;
    }
    if (pickMode === 'end') {
      if (loopStart != null && seconds <= loopStart) {
        toast.error('Điểm kết thúc phải sau điểm bắt đầu.');
        setPickMode(null);
        return;
      }
      setLoopEnd(seconds);
      setPickMode(null);
      toast.success(`Kết thúc lặp ở ${seconds.toFixed(2)}s`);
      return;
    }
    if (pickMode === 'jump') {
      setLoopStart(seconds);
      setPickMode(null);
      toast.success(`Đặt xuất phát ở ${seconds.toFixed(2)}s`);
      return;
    }
    if (pickMode === 'segment') {
      const idx = rawSegments.findIndex((seg) => {
        const timed = seg.words.filter((w) => w.start !== null);
        if (!timed.length) return false;
        const s = timed[0].start ?? 0;
        const e = timed[timed.length - 1].end ?? 0;
        return seconds >= s - 0.01 && seconds <= e + 0.01;
      });
      if (idx >= 0) {
        setLoopSegmentIdx(idx);
        toast.success(`Lặp câu #${idx + 1}`);
      } else {
        toast.error('Không tìm thấy câu chứa từ này.');
      }
      setPickMode(null);
      return;
    }
    seekRef.current?.(seconds);
  }, [pickMode, loopStart, loopEnd, rawSegments]);

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

  // ── Drawer content ──────────────────────────────────────────────────────
  const drawerContent = (
    <div className="h-full flex flex-col bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {([
          { id: 'settings' as const, label: 'Settings', icon: SettingsIcon },
          { id: 'loop' as const, label: 'Lặp', icon: Repeat },
          { id: 'dictionary' as const, label: 'Dict', icon: BookOpen },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPanelTab(id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              panelTab === id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center justify-center gap-1">
              <Icon className="w-3 h-3" /> {label}
            </span>
          </button>
        ))}
        {/* Mobile-only close */}
        <button
          onClick={() => setPanelOpen(false)}
          className="sm:hidden px-3 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Loop tab */}
      {panelTab === 'loop' && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="loop-enabled" className="text-sm cursor-pointer flex items-center gap-2">
                <Repeat className="w-4 h-4" /> Bật lặp
              </Label>
              <Switch
                id="loop-enabled"
                checked={loopEnabled}
                onCheckedChange={() => handleToggleLoop()}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Chế độ lặp
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { v: 'range' as LoopMode, label: 'Khoảng' },
                  { v: 'jump' as LoopMode, label: 'Xuất phát' },
                  { v: 'segment' as LoopMode, label: 'Câu' },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => { setLoopMode(opt.v); setPickMode(null); }}
                    className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                      loopMode === opt.v
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {loopMode === 'range' && (
              <div className="space-y-2">
                <Button
                  variant={pickMode === 'start' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full h-9 gap-2 justify-between"
                  onClick={handleSetLoopStart}
                  disabled={!loopEnabled}
                >
                  <span className="flex items-center gap-2">
                    <Flag className="w-3.5 h-3.5 text-emerald-500" />
                    Bắt đầu
                  </span>
                  <span className="font-mono text-xs">
                    {loopStart != null ? `${loopStart.toFixed(2)}s` : '—'}
                  </span>
                </Button>
                <Button
                  variant={pickMode === 'end' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full h-9 gap-2 justify-between"
                  onClick={handleSetLoopEnd}
                  disabled={!loopEnabled}
                >
                  <span className="flex items-center gap-2">
                    <FlagOff className="w-3.5 h-3.5 text-rose-500" />
                    Kết thúc
                  </span>
                  <span className="font-mono text-xs">
                    {loopEnd != null ? `${loopEnd.toFixed(2)}s` : '—'}
                  </span>
                </Button>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Bấm vào nút rồi bấm vào một từ trong transcript để đặt mốc.
                </p>
              </div>
            )}

            {loopMode === 'jump' && (
              <div className="space-y-2">
                <Button
                  variant={pickMode === 'jump' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full h-9 gap-2 justify-between"
                  onClick={handleSetJumpAnchor}
                >
                  <span className="flex items-center gap-2">
                    <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
                    Điểm xuất phát
                  </span>
                  <span className="font-mono text-xs">
                    {loopStart != null ? `${loopStart.toFixed(2)}s` : '—'}
                  </span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full h-9 gap-2"
                  onClick={handleJumpNow}
                  disabled={loopStart == null}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Nhảy đến điểm xuất phát
                </Button>
              </div>
            )}

            {loopMode === 'segment' && (
              <div className="space-y-2">
                <Button
                  variant={pickMode === 'segment' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full h-9 gap-2 justify-between"
                  onClick={handleSetLoopSegment}
                  disabled={!loopEnabled}
                >
                  <span className="flex items-center gap-2">
                    <Repeat className="w-3.5 h-3.5 text-emerald-500" />
                    Câu lặp
                  </span>
                  <span className="font-mono text-xs">
                    {loopSegmentIdx != null ? `#${loopSegmentIdx + 1}` : '—'}
                  </span>
                </Button>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Bấm vào nút rồi chọn từ thuộc câu muốn lặp.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}


      {/* Settings tab */}
      {panelTab === 'settings' && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Mode toggle */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Chế độ
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { value: 'study' as TranscriptionMode, label: 'Study' },
                    { value: 'read' as TranscriptionMode, label: 'Read' },
                    { value: 'segment-loop' as TranscriptionMode, label: 'Loop' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ transcriptionMode: opt.value })}
                    className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                      settings.transcriptionMode === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Highlight mode */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Highlighter className="w-3 h-3" /> Highlight đang đọc
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { value: 'token' as HighlightMode, label: 'Từ' },
                    { value: 'sentence' as HighlightMode, label: 'Câu' },
                    { value: 'none' as HighlightMode, label: 'Tắt' },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ highlightMode: opt.value })}
                    className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                      settings.highlightMode === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Layout selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <LayoutIcon className="w-3 h-3" /> Bố cục
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { value: 'split-v', label: 'Trên/Dưới', icon: Rows2 },
                    { value: 'split-h', label: 'Trái/Phải', icon: Columns2 },
                    { value: 'video', label: 'Video', icon: Square },
                    { value: 'transcript', label: 'Text', icon: BookOpen },
                  ] as const
                ).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => updateSettings({ layout: value })}
                    className={`p-2 rounded-md border text-[10px] font-medium transition-colors flex flex-col items-center gap-1 ${
                      settings.layout === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                Có thể kéo thanh giữa các cửa sổ để thay đổi kích thước.
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="autoscroll" className="text-sm cursor-pointer">
                Tự động cuộn
              </Label>
              <Switch
                id="autoscroll"
                checked={settings.autoScroll}
                onCheckedChange={(v) => updateSettings({ autoScroll: v })}
              />
            </div>

            <Separator />

            {/* Cloze range sliders — draft + Apply (no auto-regen on drag) */}
            {settings.transcriptionMode === 'study' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Khối ẩn (min – max)
                    </Label>
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {draftHidden[0]} – {draftHidden[1]}
                    </span>
                  </div>
                  <RangeSlider
                    min={1}
                    max={10}
                    step={1}
                    value={draftHidden}
                    onValueChange={(v) => setDraftHidden(v)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Khối hiện (min – max)
                    </Label>
                    <span className="text-xs font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">
                      {draftVisible[0]} – {draftVisible[1]}
                    </span>
                  </div>
                  <RangeSlider
                    min={0}
                    max={15}
                    step={1}
                    value={draftVisible}
                    onValueChange={(v) => setDraftVisible(v)}
                    rangeClassName="bg-emerald-500"
                  />
                </div>

                <Button
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={applyClozeSettings}
                  disabled={!clozeDirty}
                  variant={clozeDirty ? 'default' : 'outline'}
                >
                  <Check className="w-3.5 h-3.5" />
                  {clozeDirty ? 'Áp dụng & tạo lại' : 'Đã áp dụng'}
                </Button>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setSeed(Date.now())}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                    Tạo lại
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleToggleAll}
                  >
                    {allRevealed ? (
                      <EyeOff className="w-3.5 h-3.5 text-orange-500" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    {allRevealed ? 'Ẩn lại' : 'Hiện hết'}
                  </Button>
                </div>
              </>
            )}

            {/* Segment loop settings */}
            {settings.transcriptionMode === 'segment-loop' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Nhảy đến segment
                  </Label>
                  <Select
                    value={String(segmentLoopStartIdx)}
                    onValueChange={(val) => setSegmentLoopStartIdx(parseInt(val, 10))}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Chọn segment..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {rawSegments.map((seg, idx) => {
                        const preview = seg.words.slice(0, 4).map((w) => w.token).join(' ');
                        const label = `#${idx + 1} ${preview}${preview.length > 0 && seg.words.length > 4 ? '...' : ''}`;
                        return (
                          <SelectItem key={idx} value={String(idx)}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Số segment hiện (n)
                    </Label>
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {settings.segmentLoopCount}
                    </span>
                  </div>
                  <RangeSlider
                    min={1}
                    max={5}
                    step={1}
                    value={[settings.segmentLoopCount]}
                    onValueChange={(v) => updateSettings({ segmentLoopCount: v[0] })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Padding (âm thanh) – giây
                    </Label>
                    <span className="text-xs font-mono bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                      {settings.segmentLoopPadding.toFixed(2)}s
                    </span>
                  </div>
                  <RangeSlider
                    min={0}
                    max={3}
                    step={0.1}
                    value={[settings.segmentLoopPadding]}
                    onValueChange={(v) => updateSettings({ segmentLoopPadding: parseFloat(v[0].toFixed(2)) })}
                  />
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Thời gian thêm vào trước và sau segment (có âm thanh).
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Silent gap (câm) – giây
                    </Label>
                    <span className="text-xs font-mono bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded">
                      {settings.segmentLoopGap.toFixed(2)}s
                    </span>
                  </div>
                  <RangeSlider
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.segmentLoopGap]}
                    onValueChange={(v) => updateSettings({ segmentLoopGap: parseFloat(v[0].toFixed(2)) })}
                  />
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Khoảng câm để người dùng biết segment kết thúc và sắp lặp lại.
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div className="bg-primary/5 rounded-md p-2.5 border border-primary/10">
              <p className="text-[10px] text-muted-foreground leading-snug">
                Mọi cài đặt sẽ được lưu vào trình duyệt và tự động khôi phục lần sau.
              </p>
            </div>
          </div>
        </ScrollArea>
      )}


      {/* Dictionary tab */}
      {panelTab === 'dictionary' && <DictionaryPanel />}
    </div>
  );

  // ── Main content panes ──────────────────────────────────────────────────
  const videoNode = (
    <div className="bg-black w-full h-full flex items-center justify-center overflow-hidden">
      <VideoPlayer
        url={`https://www.youtube.com/watch?v=${videoId}`}
        onTimeUpdate={setCurrentTime}
        seekRef={seekRef}
      />
    </div>
  );

  const transcriptNode = (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-background h-full">
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
              Yêu cầu phiên dịch để tạo transcript với timestamp và luyện tập cloze.
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
        <div className="space-y-4 max-w-3xl mx-auto">
          {settings.transcriptionMode === 'segment-loop' ? (
            // Segment loop mode: show N segments with next/prev buttons
            <>
              <div className="space-y-3">
                {clozeSegments
                  .slice(segmentLoopStartIdx, segmentLoopEndIdx + 1)
                  .map((cs, localIdx) => {
                    const globalIdx = segmentLoopStartIdx + localIdx;
                    const isActive = globalIdx === activeSegIdx;
                    return (
                      <TranscriptSegmentRow
                        key={globalIdx}
                        cs={cs}
                        isActive={isActive}
                        showClozeMode={false}
                        highlightMode={settings.highlightMode}
                        currentTime={isActive ? currentTime : 0}
                        onSeek={handleSeek}
                        rowRef={isActive ? activeSegRef : undefined}
                      />
                    );
                  })}
              </div>

              {/* Next/Previous navigation buttons */}
              <div className="flex gap-2 justify-between sticky bottom-0 bg-background/90 backdrop-blur-sm py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (segmentLoopStartIdx > 0) {
                      setSegmentLoopStartIdx(segmentLoopStartIdx - 1);
                    }
                  }}
                  disabled={segmentLoopStartIdx === 0}
                >
                  ← Trước
                </Button>

                <div className="flex items-center text-sm text-muted-foreground">
                  Segment {segmentLoopStartIdx + 1} – {segmentLoopEndIdx + 1} / {rawSegments.length}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (segmentLoopEndIdx < rawSegments.length - 1) {
                      setSegmentLoopStartIdx(segmentLoopStartIdx + 1);
                    }
                  }}
                  disabled={segmentLoopEndIdx >= rawSegments.length - 1}
                >
                  Tiếp →
                </Button>
              </div>
            </>
          ) : (
            // Normal study/read mode: show all segments
            <>
              {clozeSegments.map((cs, si) => {
                const isActive = si === activeSegIdx;
                const segHasStart = loopStart != null && cs.tokens.some(
                  (t) => t.word.start != null && Math.abs(t.word.start - loopStart) < 0.01,
                );
                const segHasEnd = loopEnd != null && cs.tokens.some(
                  (t) => t.word.start != null && Math.abs(t.word.start - loopEnd) < 0.01,
                );
                return (
                  <TranscriptSegmentRow
                    key={si}
                    cs={cs}
                    isActive={isActive}
                    showClozeMode={settings.transcriptionMode === 'study'}
                    highlightMode={settings.highlightMode}
                    currentTime={isActive ? currentTime : 0}
                    onSeek={handleSeek}
                    rowRef={isActive ? activeSegRef : undefined}
                    loopStart={segHasStart ? loopStart : null}
                    loopEnd={segHasEnd ? loopEnd : null}
                    pickMode={null}
                  />
                );
              })}
              <div className="h-32" />
            </>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <p className="text-sm">Đã xảy ra lỗi khi tải transcript.</p>
          <Button onClick={() => window.location.reload()}>Tải lại</Button>
        </div>
      )}
    </div>
  );

  // Render based on selected layout. Mobile always falls back to vertical split
  // (video on top, transcript below) for a sane experience.
  const effectiveLayout = isMobile && (settings.layout === 'split-h')
    ? 'split-v'
    : settings.layout;

  const mainContent = (() => {
    if (effectiveLayout === 'video') {
      return <div className="h-full w-full">{videoNode}</div>;
    }
    if (effectiveLayout === 'transcript') {
      return <div className="h-full w-full">{transcriptNode}</div>;
    }
    if (effectiveLayout === 'split-h') {
      // Side-by-side: video left, transcript right
      return (
        <ResizableSplit
          left={videoNode}
          right={transcriptNode}
          initialPercent={55}
          minPercent={25}
          maxPercent={80}
          storageKey="viewer-split-h"
          className="h-full"
        />
      );
    }
    // split-v: video on top, transcript below — built with vertical resize
    return (
      <VerticalResizableSplit
        top={videoNode}
        bottom={transcriptNode}
        storageKey="viewer-split-v"
        initialPercent={45}
      />
    );
  })();

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-3 sm:px-4 bg-card shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-sm truncate max-w-[60vw] sm:max-w-md">
              {title}
            </h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:inline">
              YouTube Viewer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant={loopEnabled ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => { setPanelOpen(true); setPanelTab('loop'); }}
            title="Cài đặt lặp"
          >
            <Repeat className={`w-3.5 h-3.5 ${loopEnabled ? '' : 'opacity-70'}`} />
            <span className="hidden sm:inline">{loopEnabled ? 'Đang lặp' : 'Lặp'}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setPanelOpen((v) => !v)}
            aria-label="Toggle panel"
          >
            {panelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Body — desktop: drawer pushes layout. Mobile: drawer floats over */}
      <main className="flex-1 min-h-0 relative flex overflow-hidden">
        {/* Main */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          {mainContent}
        </div>

        {/* Drawer */}
        {panelOpen && (
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <div
                className="absolute inset-0 z-20 bg-black/40"
                onClick={() => setPanelOpen(false)}
              />
            )}
            {isMobile ? (
              <aside className="absolute top-0 right-0 bottom-0 z-30 w-[88vw] max-w-sm border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
                {drawerContent}
              </aside>
            ) : (
              <ResizableDrawer>{drawerContent}</ResizableDrawer>
            )}
          </>
        )}
      </main>
    </div>
  );
}
