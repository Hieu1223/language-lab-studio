import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ResizableSplit } from '@/components/ResizableSplit';
import {
  getTranscriptInfo,
  getTranscriptData,
  isTranscriptError,
  isTranscriptReady,
  describeTranscriptStatus,
  type TranscriptInfo,
  type TranscriptSegment,
} from '@/lib/api/transcription';
import {
  generateBlockCloze,
  type BlockClozeOptions,
  type ClozeSegment,
} from '@/lib/cloze-block';
import { TranscriptSegmentRow } from '@/components/transcription/TranscriptSegmentRow';

const DEFAULT_CLOZE_OPTS: BlockClozeOptions = {
  minHidden: 1,
  maxHidden: 3,
  minVisible: 2,
  maxVisible: 5,
  requireTimestamp: true,
};

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 60;

type ViewStatus = 'checking' | 'processing' | 'ready' | 'error' | 'not_found';

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
      if (next.minHidden > next.maxHidden) next.maxHidden = next.minHidden;
      if (next.minVisible > next.maxVisible) next.maxVisible = next.minVisible;
      return next;
    });

  return (
    <div className="space-y-5">
      {[
        { key: 'minHidden' as const, label: 'Ẩn liên tiếp (min)', color: 'primary', min: 1, max: 10 },
        { key: 'maxHidden' as const, label: 'Ẩn liên tiếp (max)', color: 'primary', min: 1, max: 10 },
        { key: 'minVisible' as const, label: 'Hiện giữa (min)', color: 'green', min: 0, max: 15 },
        { key: 'maxVisible' as const, label: 'Hiện giữa (max)', color: 'green', min: 0, max: 15 },
      ].map(({ key, label, color, min, max }) => (
        <div key={key} className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">{label}</label>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded ${
                color === 'primary' ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-500'
              }`}
            >
              {opts[key]}
            </span>
          </div>
          <Slider
            value={[opts[key]]}
            min={min}
            max={max}
            step={1}
            onValueChange={([v]) => update({ [key]: v } as Partial<BlockClozeOptions>)}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function TranscribeViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ViewStatus>('checking');
  const [transcriptInfo, setTranscriptInfo] = useState<TranscriptInfo | null>(null);
  const [rawSegments, setRawSegments] = useState<TranscriptSegment[]>([]);
  const [clozeSegments, setClozeSegments] = useState<ClozeSegment[]>([]);
  const pollAbortRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [seed, setSeed] = useState(() => Date.now());
  const [clozeOpts, setClozeOpts] = useState<BlockClozeOptions>(DEFAULT_CLOZE_OPTS);
  const [showClozeMode, setShowClozeMode] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeSegRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<((seconds: number) => void) | null>(null);

  // Status-aware load: poll /info first; only fetch /data when status === 3
  useEffect(() => {
    if (!id) return;
    pollAbortRef.current = false;

    const fetchData = async () => {
      try {
        const data = await getTranscriptData(id);
        if (data?.segments?.length) {
          setRawSegments(data.segments);
          setStatus('ready');
          return true;
        }
      } catch {
        /* fall through */
      }
      return false;
    };

    const poll = async () => {
      let attempts = 0;
      while (!pollAbortRef.current && attempts < POLL_MAX_ATTEMPTS) {
        attempts++;
        try {
          const info = await getTranscriptInfo(id);
          if (!info) {
            setStatus('not_found');
            return;
          }
          setTranscriptInfo(info);
          if (isTranscriptError(info.status)) {
            setStatus('error');
            return;
          }
          if (isTranscriptReady(info.status)) {
            const ok = await fetchData();
            if (ok) return;
          } else {
            setStatus('processing');
          }
        } catch {
          /* keep polling */
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!pollAbortRef.current) {
        toast.warning('Đang mất nhiều thời gian hơn dự kiến.');
      }
    };

    setStatus('checking');
    poll();

    return () => {
      pollAbortRef.current = true;
    };
  }, [id]);

  useEffect(() => {
    if (rawSegments.length === 0) {
      setClozeSegments([]);
      return;
    }
    setClozeSegments(generateBlockCloze(rawSegments, clozeOpts, seed));
    setAllRevealed(false);
  }, [rawSegments, clozeOpts, seed]);

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

  const handleSeek = useCallback((seconds: number) => {
    seekRef.current?.(seconds);
  }, []);

  if (status === 'checking') {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'error' || status === 'not_found') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4 text-center px-6">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold">
          {status === 'not_found' ? 'Không tìm thấy bản phiên dịch' : 'Bản phiên dịch lỗi'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {status === 'not_found'
            ? 'Bản phiên dịch này không tồn tại hoặc đã bị xoá.'
            : `Trạng thái: ${describeTranscriptStatus(transcriptInfo?.status ?? 4)}. Vui lòng thử lại sau.`}
        </p>
        <Button onClick={() => navigate('/youtube')} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Về danh sách video
        </Button>
      </div>
    );
  }

  const leftPane = (
    <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-background">
      <div className="rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        <VideoPlayer
          url={transcriptInfo?.resource_url || ''}
          onTimeUpdate={setCurrentTime}
          seekRef={seekRef}
        />
      </div>
      <div className="bg-card border rounded-2xl p-4 flex-1 min-h-0 overflow-y-auto">
        <h3 className="text-xs font-bold mb-2 text-primary uppercase tracking-wider">
          Transcript metadata
        </h3>
        <div className="text-sm space-y-1.5 text-muted-foreground">
          <p><span className="text-foreground font-medium">Source:</span> {transcriptInfo?.original_source}</p>
          <p className="break-all"><span className="text-foreground font-medium">URL:</span> {transcriptInfo?.resource_url}</p>
          <p><span className="text-foreground font-medium">ID:</span> {id}</p>
          {transcriptInfo && (
            <p>
              <span className="text-foreground font-medium">Trạng thái:</span>{' '}
              {describeTranscriptStatus(transcriptInfo.status)}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const rightPane = (
    <div className="flex flex-col h-full min-h-0 bg-card border-l relative">
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          Transcript
        </span>
        <div className="flex items-center gap-2">
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
              data-testid="cloze-mode-study"
            >
              Study
            </button>
            <button
              onClick={() => setShowClozeMode(false)}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                !showClozeMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
              data-testid="cloze-mode-read"
            >
              Read
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSettingsOpen((v) => !v)}
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {status === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Đang xử lý transcript...</p>
            <p className="text-xs">
              {transcriptInfo
                ? describeTranscriptStatus(transcriptInfo.status)
                : 'Vui lòng đợi'}
            </p>
          </div>
        )}
        {status === 'ready' && clozeSegments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Không có segment nào.
          </div>
        ) : status === 'ready' ? (
          <div className="space-y-6">
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
        ) : null}
      </div>

      {settingsOpen && (
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
              <Sparkles className="w-3 h-3" /> Tips
            </h4>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Hover từ ẩn để xem nhanh. Nhấp từ để tua video. Hover một câu để hiện nút phân tích từ.
            </p>
          </div>
        </aside>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/youtube')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-sm truncate max-w-md">
              {transcriptInfo?.original_source}
            </h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Cloze Master
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative overflow-hidden">
        <ResizableSplit
          left={leftPane}
          right={rightPane}
          storageKey="transcriptview-split"
          initialPercent={50}
          minPercent={25}
          maxPercent={75}
        />
      </main>
    </div>
  );
}
