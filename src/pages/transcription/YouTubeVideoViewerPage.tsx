import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Accessibility,
} from 'lucide-react';

import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { RangeSlider } from '@/components/ui/range-slider';
import { Slider } from '@/components/ui/slider';
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
  getTranscriptionDetail,
  requestTranscription,
  previewVideo,
  visitVideo,
  isTranscriptError,
  isTranscriptReady,
  type TranscriptDetailResponse,
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
import { A11ySegmentViewer } from '@/components/transcription/A11ySegmentViewer';
import { ResizableDrawer } from '@/components/transcription/ResizableDrawer';

// ─── Config ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 60;

type PageStatus = 'checking' | 'not_found' | 'processing' | 'ready' | 'error';
type PanelTab = 'settings' | 'loop' | 'dictionary';

// ─── Main ────────────────────────────────────────────────────────────────

export default function YouTubeVideoViewerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation('transcription');

  // Track whether we came from a direct URL (for smart back button)
  const [fromDirectUrl, setFromDirectUrl] = useState(() => {
    return !sessionStorage.getItem('selectedVideo');
  });

  // Selected video metadata (from browse page sessionStorage, or fetched on direct load)
  const [video, setVideo] = useState<VideoPreview | null>(() => {
    const raw = sessionStorage.getItem('selectedVideo');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Fetch video data on direct URL access
  useEffect(() => {
    if (!videoId || video) return;
    let cancelled = false;

    (async () => {
      try {
        const info = await previewVideo(videoId);
        if (cancelled) return;

        setVideo({
          id: info.id,
          title: info.title,
          thumbnail_url: info.thumbnail_url,
          channel: {
            id: info.channel.id,
            name: info.channel.name,
            url: info.channel.url,
          },
          duration: info.duration ?? null,
          description: info.description,
          view_count: info.view_count,
        });
      } catch (error) {
        console.error('Failed to fetch YouTube video data:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoId, video]);

  // Transcript state
  const [status, setStatus] = useState<PageStatus>('checking');
  const [transcriptInfo, setTranscriptInfo] = useState<TranscriptDetailResponse | null>(null);
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
  const [regenerateNonce, setRegenerateNonce] = useState(() => Date.now());
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
  const controlsRef = useRef<{
    play: () => void;
    pause: () => void;
    toggle: () => void;
    skipBy: (seconds: number) => void;
    isPlaying: () => boolean;
  } | null>(null);
  const lastSeekTimeRef = useRef<number>(0);
  /** Target time of the most recent programmatic seek (anki mode). */
  const pendingSeekTargetRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  // ── Segment loop mode state ──────────────────────────────────────────────
  const [segmentLoopStartIdx, setSegmentLoopStartIdx] = useState<number>(0);
  const segmentLoopEndIdx = Math.min(
    segmentLoopStartIdx + settings.segmentLoopCount - 1,
    rawSegments.length - 1,
  );

  // Calculate segment loop boundaries: include padding before first and after last
  const segmentLoopBounds = useMemo(() => {
    if (!settings.a11yMode || rawSegments.length === 0) {
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
    settings.a11yMode,
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
        // The API has no "find by video id" lookup; visiting the video returns
        // (or creates) its transcript detail, which we then poll if needed.
        const base = video
          ? { name: video.title || videoId, thumbnail_url: video.thumbnail_url || '', original_source: 'Youtube' }
          : { name: videoId, thumbnail_url: '', original_source: 'Youtube' };
        const info = await visitVideo({
          name: base.name,
          thumbnail_url: base.thumbnail_url,
          resource_url: `https://www.youtube.com/watch?v=${videoId}`,
          user_id: user?.id ?? '',
          resource_id: videoId,
          original_source: base.original_source,
        });
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
        const info = await getTranscriptionDetail(transcriptId);
        const data = info?.data;
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
        const info = await getTranscriptionDetail(transcriptId);
        if (info) {
          setTranscriptInfo(info);
          if (isTranscriptError(info.status)) {
            setStatus('error');
            return;
          }
          if (isTranscriptReady(info.status)) {
            const data = info.data;
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
        toast.warning(t('viewer.slowWarning'));
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    setTimeout(tick, POLL_INTERVAL_MS);
  }, [t]);

  // ── Regenerate cloze when rawSegments / opts / nonce change ───────────────
  useEffect(() => {
    if (rawSegments.length === 0) {
      setClozeSegments([]);
      return;
    }
    const next = generateBlockCloze(rawSegments, clozeOpts);
    setClozeSegments(next);
    setAllRevealed(false);
  }, [rawSegments, clozeOpts, regenerateNonce]);

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

  // Track the active word's key (segIdx-tokenIdx) so scrolling re-runs only
  // when the current word changes, not on every currentTime tick.
  const activeWordKey = useMemo(() => {
    if (activeSegIdx < 0) return null;
    // Search forward from activeSegIdx, skipping tokens with invalid timestamps.
    for (let si = activeSegIdx; si < rawSegments.length; si++) {
      const seg = rawSegments[si];
      if (!seg) continue;
      const ti = seg.words.findIndex(
        (w) =>
          w.start !== null &&
          w.end !== null &&
          currentTime >= w.start &&
          currentTime <= w.end,
      );
      if (ti >= 0) return `${si}-${ti}`;
    }
    return null;
  }, [rawSegments, activeSegIdx, currentTime]);

  useEffect(() => {
    if (!settings.autoScroll) return;
    // Anki mode renders a single card — auto-scroll would fight the fixed layout.
    if (settings.transcriptionMode === 'anki' && !settings.a11yMode) return;

    // Prefer scrolling to the current word when in token highlight mode.
    if (settings.highlightMode === 'token' && activeWordKey) {
      const el = document.querySelector<HTMLElement>('[data-active-word="true"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    if (activeSegRef.current) {
      activeSegRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [
    activeWordKey,
    activeSegIdx,
    settings.autoScroll,
    settings.highlightMode,
    settings.transcriptionMode,
    settings.a11yMode,
  ]);


  // ── Loop logic — three modes + segment-loop mode ─────────────────────────
  useEffect(() => {
    if (!loopEnabled) return;
    // Anki mode drives playback itself (pause at end of card) — no looping.
    if (settings.transcriptionMode === 'anki' && !settings.a11yMode) return;

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
  }, [currentTime, loopEnabled, loopMode, loopStart, loopEnd, loopSegmentIdx, rawSegments, settings.transcriptionMode, settings.a11yMode]);

  // ── A11y mode: auto-loop N-segment block with silent gap ─────────────────
  useEffect(() => {
    if (!settings.a11yMode) return;
    if (!segmentLoopBounds) return;

    const { loopStart, silentGapEnd } = segmentLoopBounds;

    // When we reach the silent gap end (loop restart point), loop back
    if (currentTime >= silentGapEnd) {
      seekRef.current?.(loopStart);
    }
  }, [currentTime, settings.a11yMode, segmentLoopBounds]);

  // ── Anki mode helpers ────────────────────────────────────────────────────
  /** Timed [start, end] bounds of a segment, ignoring tokens without timestamps. */
  const getSegmentBounds = useCallback(
    (idx: number): { start: number; end: number } | null => {
      const seg = rawSegments[idx];
      if (!seg?.words?.length) return null;
      const timed = seg.words.filter((w) => w.start !== null || w.end !== null);
      if (timed.length === 0) return null;
      const first = timed[0];
      const last = timed[timed.length - 1];
      const start = first.start ?? first.end ?? 0;
      const end = last.end ?? last.start ?? start;
      if (!(end > start)) return null;
      return { start, end };
    },
    [rawSegments],
  );

  /** Jump to a card index and start playback from its beginning. */
  const playSegmentCard = useCallback(
    (idx: number) => {
      if (rawSegments.length === 0) return;
      const clamped = Math.max(0, Math.min(rawSegments.length - 1, idx));
      setSegmentLoopStartIdx(clamped);
      const bounds = getSegmentBounds(clamped);
      if (!bounds) return;
      // Mark the seek and optimistically reset currentTime so the auto-pause
      // effect never sees the stale end-of-segment timestamp.
      lastSeekTimeRef.current = Date.now();
      pendingSeekTargetRef.current = bounds.start;
      setCurrentTime(bounds.start);
      seekRef.current?.(bounds.start);
      controlsRef.current?.play();
    },
    [rawSegments, getSegmentBounds],
  );

  // Keep the card index valid when the transcript loads/changes.
  useEffect(() => {
    if (rawSegments.length === 0) return;
    setSegmentLoopStartIdx((i) => Math.max(0, Math.min(rawSegments.length - 1, i)));
  }, [rawSegments]);

  // ── Anki mode: auto-pause at end of current segment (no auto-repeat) ─────
  useEffect(() => {
    if (settings.transcriptionMode !== 'anki' || settings.a11yMode) return;
    if (!isPlaying) return;
    const bounds = getSegmentBounds(segmentLoopStartIdx);
    if (!bounds) return;

    // Ignore stale time reports right after a seek: wait until the player
    // actually reports a time at/after the requested position.
    const target = pendingSeekTargetRef.current;
    if (target != null) {
      if (currentTime >= target - 0.3 && currentTime < bounds.end - 0.05) {
        pendingSeekTargetRef.current = null;
      } else {
        if (Date.now() - lastSeekTimeRef.current > 2000) {
          pendingSeekTargetRef.current = null;
        }
        return;
      }
    }

    if (currentTime >= bounds.end - 0.05) {
      controlsRef.current?.pause();
    }
  }, [

    currentTime,
    settings.transcriptionMode,
    settings.a11yMode,
    getSegmentBounds,
    segmentLoopStartIdx,
    isPlaying,
  ]);


  const handleSetLoopStart = () => {
    setPickMode((m) => (m === 'start' ? null : 'start'));
    if (pickMode !== 'start') toast.info(t('loop.pickStart'));
  };
  const handleSetLoopEnd = () => {
    setPickMode((m) => (m === 'end' ? null : 'end'));
    if (pickMode !== 'end') toast.info(t('loop.pickEnd'));
  };
  const handleSetJumpAnchor = () => {
    setPickMode((m) => (m === 'jump' ? null : 'jump'));
    if (pickMode !== 'jump') toast.info(t('loop.pickJump'));
  };
  const handleJumpNow = () => {
    if (loopStart == null) {
      toast.error(t('loop.noJumpAnchor'));
      return;
    }
    seekRef.current?.(loopStart);
  };
  const handleSetLoopSegment = () => {
    setPickMode((m) => (m === 'segment' ? null : 'segment'));
    if (pickMode !== 'segment') toast.info(t('loop.pickSegment'));
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
    setRegenerateNonce(Date.now());
    toast.success(t('viewer.settingsApplied'));
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleRequestTranscription = async () => {
    if (!user?.id || !videoId) {
      toast.error(t('viewer.loginRequired'));
      return;
    }
    try {
      setRequesting(true);
      setStatus('processing');
      const res = await requestTranscription({
        name: video?.title || 'YouTube Video',
        thumbnail_url: video?.thumbnail_url || '',
        resource_url: `https://www.youtube.com/watch?v=${videoId}`,
        user_id: user.id,
        resource_id: videoId,
        original_source: 'Youtube',
      });
      toast.success(t('viewer.requested'));
      const info = await getTranscriptionDetail(res.transcript_id).catch(() => null);
      if (info) setTranscriptInfo(info);
      startPolling(res.transcript_id);
    } catch (err) {
      console.error(err);
      toast.error(t('viewer.requestFailed'));
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
      toast.success(t('loop.startSet', { seconds: seconds.toFixed(2) }));
      return;
    }
    if (pickMode === 'end') {
      if (loopStart != null && seconds <= loopStart) {
        toast.error(t('loop.endBeforeStart'));
        setPickMode(null);
        return;
      }
      setLoopEnd(seconds);
      setPickMode(null);
      toast.success(t('loop.endSet', { seconds: seconds.toFixed(2) }));
      return;
    }
    if (pickMode === 'jump') {
      setLoopStart(seconds);
      setPickMode(null);
      toast.success(t('loop.jumpSet', { seconds: seconds.toFixed(2) }));
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
        toast.success(t('loop.segmentSet', { index: idx + 1 }));
      } else {
        toast.error(t('loop.segmentNotFound'));
      }
      setPickMode(null);
      return;
    }
    seekRef.current?.(seconds);
  }, [pickMode, loopStart, loopEnd, rawSegments, t]);

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
  const title = video?.title || transcriptInfo?.original_source || t('viewer.defaultTitle');

  // ── Drawer content ──────────────────────────────────────────────────────
  const drawerContent = (
    <div className="h-full flex flex-col bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {([
          { id: 'settings' as const, label: t('viewer.tabSettings'), icon: SettingsIcon },
          { id: 'loop' as const, label: t('viewer.tabLoop'), icon: Repeat },
          { id: 'dictionary' as const, label: t('viewer.tabDict'), icon: BookOpen },
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
          aria-label={t('close')}
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
                <Repeat className="w-4 h-4" /> {t('loop.enable')}
              </Label>
              <Switch
                id="loop-enabled"
                checked={loopEnabled}
                onCheckedChange={() => handleToggleLoop()}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('loop.mode')}
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { v: 'range' as LoopMode, label: t('loop.modeRange') },
                  { v: 'jump' as LoopMode, label: t('loop.modeJump') },
                  { v: 'segment' as LoopMode, label: t('loop.modeSegment') },
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
                    {t('loop.start')}
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
                    {t('loop.end')}
                  </span>
                  <span className="font-mono text-xs">
                    {loopEnd != null ? `${loopEnd.toFixed(2)}s` : '—'}
                  </span>
                </Button>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {t('loop.rangeHint')}
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
                    {t('loop.jumpAnchor')}
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
                  {t('loop.jumpTo')}
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
                    {t('loop.segment')}
                  </span>
                  <span className="font-mono text-xs">
                    {loopSegmentIdx != null ? `#${loopSegmentIdx + 1}` : '—'}
                  </span>
                </Button>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {t('loop.segmentHint')}
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
                {t('settings.mode')}
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { value: 'study' as TranscriptionMode, label: t('settings.modeStudy') },
                    { value: 'read' as TranscriptionMode, label: t('settings.modeRead') },
                    { value: 'anki' as TranscriptionMode, label: t('settings.modeAnki') },
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
                <Highlighter className="w-3 h-3" /> {t('settings.highlight')}
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { value: 'token' as HighlightMode, label: t('settings.highlightToken') },
                    { value: 'sentence' as HighlightMode, label: t('settings.highlightSentence') },
                    { value: 'none' as HighlightMode, label: t('settings.highlightNone') },
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
                <LayoutIcon className="w-3 h-3" /> {t('settings.layout')}
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { value: 'split-v', label: t('settings.layoutSplitV'), icon: Rows2 },
                    { value: 'split-h', label: t('settings.layoutSplitH'), icon: Columns2 },
                    { value: 'video', label: t('settings.layoutVideo'), icon: Square },
                    { value: 'transcript', label: t('settings.layoutTranscript'), icon: BookOpen },
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
                {t('settings.layoutHint')}
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="a11y-mode" className="text-sm cursor-pointer flex items-center gap-2">
                <Accessibility className="w-4 h-4 text-primary" />
                <span>
                  {t('settings.a11yMode')}
                  <span className="block text-[10px] text-muted-foreground font-normal">
                    {t('settings.a11yHint')}
                  </span>
                </span>
              </Label>
              <Switch
                id="a11y-mode"
                checked={settings.a11yMode}
                onCheckedChange={(v) => updateSettings({ a11yMode: v })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="autoscroll" className="text-sm cursor-pointer">
                {t('settings.autoScroll')}
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
                      {t('settings.hiddenRange')}
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
                      {t('settings.visibleRange')}
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
                  {clozeDirty ? t('settings.applyRegenerate') : t('settings.applied')}
                </Button>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setRegenerateNonce(Date.now())}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                    {t('settings.regenerate')}
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
                    {allRevealed ? t('settings.hideAgain') : t('settings.revealAll')}
                  </Button>
                </div>
              </>
            )}

            {/* Segment loop settings (used in a11y block-loop mode) */}
            {settings.a11yMode && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    {t('settings.jumpToSegment')}
                  </Label>
                  <Select
                    value={String(segmentLoopStartIdx)}
                    onValueChange={(val) => setSegmentLoopStartIdx(parseInt(val, 10))}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder={t('settings.selectSegment')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {rawSegments.map((seg, idx) => {
                        const preview = seg.words.slice(0, 4).map((w) => w.token).join(' ');
                        const label = t('settings.segmentOption', {
                          index: idx + 1,
                          preview: `${preview}${preview.length > 0 && seg.words.length > 4 ? '...' : ''}`,
                        });
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
                      {t('settings.segmentCount')}
                    </Label>
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {settings.segmentLoopCount ?? 2}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[settings.segmentLoopCount ?? 2]}
                    onValueChange={(v) => updateSettings({ segmentLoopCount: v[0] })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t('settings.padding')}
                    </Label>
                    <span className="text-xs font-mono bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                      {(settings.segmentLoopPadding ?? 0).toFixed(2)}s
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={3}
                    step={0.1}
                    value={[settings.segmentLoopPadding ?? 0]}
                    onValueChange={(v) => updateSettings({ segmentLoopPadding: parseFloat(v[0].toFixed(2)) })}
                  />
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {t('settings.paddingHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      {t('settings.silentGap')}
                    </Label>
                    <span className="text-xs font-mono bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded">
                      {(settings.segmentLoopGap ?? 0).toFixed(2)}s
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={[settings.segmentLoopGap ?? 0]}
                    onValueChange={(v) => updateSettings({ segmentLoopGap: parseFloat(v[0].toFixed(2)) })}
                  />
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {t('settings.silentGapHint')}
                  </p>
                </div>
              </>
            )}

            <Separator />

            <div className="bg-primary/5 rounded-md p-2.5 border border-primary/10">
              <p className="text-[10px] text-muted-foreground leading-snug">
                {t('settings.persistNote')}
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
        controlsRef={controlsRef}
        onPlayingChange={setIsPlaying}
      />
    </div>
  );


  const transcriptNode = (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-background h-full">
      {status === 'checking' && (
        <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">{t('transcript.checking')}</p>
        </div>
      )}

      {status === 'not_found' && (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 max-w-sm">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
              {t('transcript.none')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('transcript.noneHint')}
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
                {t('transcript.requesting')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {t('transcript.request')}
              </>
            )}
          </Button>
        </div>
      )}

      {status === 'processing' && (
        <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground text-center px-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">{t('transcript.processing')}</p>
          <p className="text-xs">{t('transcript.processingHint')}</p>
        </div>
      )}

      {status === 'ready' && rawSegments.length > 0 && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {settings.transcriptionMode === 'anki' ? (
            // Anki mode: one segment as a card with fixed Repeat / Next buttons
            (() => {
              const cs = clozeSegments[segmentLoopStartIdx];
              const isActive = segmentLoopStartIdx === activeSegIdx;
              const goTo = (idx: number) => playSegmentCard(idx);
              const handleRepeat = () => playSegmentCard(segmentLoopStartIdx);

              return (
                <div className="flex flex-col gap-4">
                  {cs ? (
                    <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 shadow-sm min-h-[40vh] flex items-center justify-center">
                      <div className="w-full" lang="ja">
                        <TranscriptSegmentRow
                          cs={cs}
                          isActive={isActive}
                          showClozeMode={false}
                          highlightMode={settings.highlightMode}
                          currentTime={isActive ? currentTime : 0}
                          onSeek={handleSeek}
                          rowRef={isActive ? activeSegRef : undefined}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">{t('transcript.noSentences')}</div>
                  )}

                  {/* Fixed 3-column bar so button positions never shift */}
                  <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] border-t border-border">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        className="min-h-14 text-sm sm:text-base gap-2"
                        onClick={() => goTo(segmentLoopStartIdx - 1)}
                        disabled={segmentLoopStartIdx === 0}
                        aria-label={t('anki.prevSentence')}
                      >
                        {t('anki.prev')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        className="min-h-14 text-sm sm:text-base gap-2"
                        onClick={handleRepeat}
                        aria-label={t('anki.repeat')}
                      >
                        <Repeat className="w-5 h-5" />
                        {t('anki.repeatShort')}
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        className="min-h-14 text-sm sm:text-base gap-2"
                        onClick={() => goTo(segmentLoopStartIdx + 1)}
                        disabled={segmentLoopStartIdx >= rawSegments.length - 1}
                        aria-label={t('anki.nextSentence')}
                      >
                        {t('anki.next')}
                      </Button>
                    </div>
                    <div className="text-center text-xs text-muted-foreground mt-2" aria-live="polite">
                      {t('anki.counter', {
                        current: segmentLoopStartIdx + 1,
                        total: rawSegments.length,
                      })}
                    </div>
                  </div>
                </div>
              );
            })()
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
          <p className="text-sm">{t('transcript.loadError')}</p>
          <Button onClick={() => window.location.reload()}>{t('transcript.reload')}</Button>
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

  // ── Accessibility (blind / low-vision) handlers ─────────────────────────
  const a11ySkip = useCallback((sec: number) => {
    controlsRef.current?.skipBy(sec);
  }, []);
  const a11yTogglePlay = useCallback(() => {
    controlsRef.current?.toggle();
  }, []);
  const a11yPrevSeg = useCallback(() => {
    setSegmentLoopStartIdx((i) => Math.max(0, i - 1));
  }, []);
  const a11yNextSeg = useCallback(() => {
    setSegmentLoopStartIdx((i) =>
      Math.min(rawSegments.length - 1, i + settings.segmentLoopCount),
    );
  }, [rawSegments.length, settings.segmentLoopCount]);
  const a11yReplayLoop = useCallback(() => {
    if (segmentLoopBounds) seekRef.current?.(segmentLoopBounds.loopStart);
  }, [segmentLoopBounds]);

  // When a11y mode is on, force anki (segment-based) transcription mode.
  useEffect(() => {
    if (settings.a11yMode && settings.transcriptionMode !== 'anki') {
      updateSettings({ transcriptionMode: 'anki' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.a11yMode]);

  return (
    <div className="h-dvh flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-3 sm:px-4 bg-card shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fromDirectUrl ? navigate('/youtube') : navigate(-1)}
              className="flex-shrink-0"
              aria-label={t('viewer.back')}
            >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-sm truncate max-w-[60vw] sm:max-w-md">
              {title}
            </h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:inline">
              {t('viewer.subtitle')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!settings.a11yMode && settings.transcriptionMode !== 'anki' && (
            <Button
              variant={loopEnabled ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => { setPanelOpen(true); setPanelTab('loop'); }}
              title={t('viewer.loopSettings')}
            >
              <Repeat className={`w-3.5 h-3.5 ${loopEnabled ? '' : 'opacity-70'}`} />
              <span className="hidden sm:inline">{loopEnabled ? t('viewer.looping') : t('viewer.loop')}</span>
            </Button>
          )}
          {settings.a11yMode && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-xs text-primary font-medium px-2"
              aria-hidden="true"
            >
              <Accessibility className="w-3.5 h-3.5" /> {t('viewer.a11yBadge')}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => { setPanelOpen((v) => !v); setPanelTab('settings'); }}
            aria-label={panelOpen ? t('viewer.closePanel') : t('viewer.openPanel')}
          >
            {panelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Body — desktop: drawer pushes layout. Mobile: drawer floats over */}
      <main className="flex-1 min-h-0 relative flex overflow-hidden">
        {/* Main */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          {settings.a11yMode ? (
            <>
              {/* Video kept mounted for audio + seek, hidden from view */}
              <div
                className="absolute w-px h-px overflow-hidden pointer-events-none opacity-0"
                aria-hidden="true"
              >
                {videoNode}
              </div>
              <A11ySegmentViewer
                rawSegments={rawSegments}
                clozeSegments={clozeSegments}
                segmentLoopStartIdx={segmentLoopStartIdx}
                segmentLoopCount={settings.segmentLoopCount}
                isPlaying={isPlaying}
                onTogglePlay={a11yTogglePlay}
                onSkipSeconds={a11ySkip}
                onPrevSegment={a11yPrevSeg}
                onNextSegment={a11yNextSeg}
                onReplayLoop={a11yReplayLoop}
              />
            </>
          ) : (
            mainContent
          )}
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
