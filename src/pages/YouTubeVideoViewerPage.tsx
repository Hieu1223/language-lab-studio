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
} from 'lucide-react';

import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { RangeSlider } from '@/components/ui/range-slider';
import { Switch } from '@/components/ui/switch';
import { ResizableSplit, VerticalResizableSplit } from '@/components/ResizableSplit';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from '@/lib/settings-storage';
import { TranscriptSegmentRow } from '@/components/transcription/TranscriptSegmentRow';

// ─── Config ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 60;

type PageStatus = 'checking' | 'not_found' | 'processing' | 'ready' | 'error';
type PanelTab = 'settings' | 'dictionary';

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

  // ── Loop state — token-level start/end with timestamps ───────────────────
  const [loopStart, setLoopStart] = useState<number | null>(null); // seconds
  const [loopEnd, setLoopEnd] = useState<number | null>(null);     // seconds
  const [loopEnabled, setLoopEnabled] = useState(false);

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

  // ── Loop logic — token-level start/end (in seconds) ─────────────────────
  // While loopEnabled, jump back to loopStart whenever currentTime crosses end.
  useEffect(() => {
    if (!loopEnabled || loopStart == null || loopEnd == null) return;
    if (currentTime >= loopEnd) {
      seekRef.current?.(loopStart);
    }
  }, [currentTime, loopEnabled, loopStart, loopEnd]);

  // Set loop start = current playback time (snap to nearest word start ≤ now)
  const handleSetLoopStart = () => {
    let candidate = currentTime;
    // snap to the start of the word currently being spoken if any
    for (const seg of rawSegments) {
      for (const w of seg.words) {
        if (w.start != null && w.end != null && currentTime >= w.start && currentTime <= w.end) {
          candidate = w.start;
          break;
        }
      }
    }
    setLoopStart(candidate);
    if (loopEnd != null && candidate >= loopEnd) setLoopEnd(null);
    toast.success(`Bắt đầu lặp ở ${candidate.toFixed(2)}s`);
  };

  const handleSetLoopEnd = () => {
    let candidate = currentTime;
    for (const seg of rawSegments) {
      for (const w of seg.words) {
        if (w.start != null && w.end != null && currentTime >= w.start && currentTime <= w.end) {
          candidate = w.end;
          break;
        }
      }
    }
    if (loopStart != null && candidate <= loopStart) {
      toast.error('Điểm kết thúc phải sau điểm bắt đầu.');
      return;
    }
    setLoopEnd(candidate);
    toast.success(`Kết thúc lặp ở ${candidate.toFixed(2)}s`);
  };

  const handleToggleLoop = () => {
    if (!loopEnabled) {
      if (loopStart == null || loopEnd == null) {
        toast.error('Hãy đặt điểm bắt đầu và kết thúc trước.');
        return;
      }
    }
    setLoopEnabled((v) => !v);
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

  // ── Drawer content ──────────────────────────────────────────────────────
  const drawerContent = (
    <div className="h-full flex flex-col bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {([
          { id: 'settings' as const, label: 'Settings', icon: SettingsIcon },
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

      {/* Settings tab */}
      {panelTab === 'settings' && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Mode toggle */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Chế độ
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { value: true, label: 'Study (Cloze)' },
                    { value: false, label: 'Read (Plain)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => updateSettings({ showClozeMode: opt.value })}
                    className={`p-2 rounded-md border text-xs font-medium transition-colors ${
                      settings.showClozeMode === opt.value
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
            {settings.showClozeMode && (
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
        <div className="space-y-3 max-w-3xl mx-auto">
          {clozeSegments.map((cs, si) => (
            <TranscriptSegmentRow
              key={si}
              cs={cs}
              isActive={si === activeSegIdx}
              showClozeMode={settings.showClozeMode}
              highlightMode={settings.highlightMode}
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
          {/* Loop controls — only the toggle is always visible. Set-start /
              set-end appear only when looping is enabled. */}
          <Button
            variant={loopEnabled ? 'default' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleToggleLoop}
            title={loopEnabled ? 'Tắt lặp' : 'Bật lặp (cần đặt mốc trước)'}
          >
            <Repeat className={`w-3.5 h-3.5 ${loopEnabled ? '' : 'opacity-70'}`} />
            <span className="hidden sm:inline">{loopEnabled ? 'Đang lặp' : 'Lặp'}</span>
          </Button>

          {loopEnabled && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-[11px]"
                onClick={handleSetLoopStart}
                title="Đặt điểm bắt đầu = thời điểm hiện tại"
              >
                <Flag className="w-3 h-3 text-emerald-500" />
                <span className="font-mono">
                  {loopStart != null ? `${loopStart.toFixed(1)}s` : '—'}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-[11px]"
                onClick={handleSetLoopEnd}
                title="Đặt điểm kết thúc = thời điểm hiện tại"
              >
                <FlagOff className="w-3 h-3 text-rose-500" />
                <span className="font-mono">
                  {loopEnd != null ? `${loopEnd.toFixed(1)}s` : '—'}
                </span>
              </Button>
            </>
          )}

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
