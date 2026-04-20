import { useEffect, useState, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ResizableSplit } from '@/components/ResizableSplit';
import {
  getTranscriptInfo,
  getTranscriptData,
  type TranscriptInfo,
  type TranscriptSegment,
} from '@/lib/api/transcription-real';
import {
  generateBlockCloze,
  type BlockClozeOptions,
  type ClozeSegment,
  type ClozeToken,
} from '@/lib/cloze-block';

const DEFAULT_CLOZE_OPTS: BlockClozeOptions = {
  minHidden: 1,
  maxHidden: 3,
  minVisible: 2,
  maxVisible: 5,
  requireTimestamp: true,
};

// ─── Word ─────────────────────────────────────────────────────────────────

function ClozeWord({
  ct,
  isCurrent,
  onToggle,
  showClozeMode,
}: {
  ct: ClozeToken;
  isCurrent: boolean;
  onToggle: () => void;
  showClozeMode: boolean;
}) {
  const { word, isCloze, revealed } = ct;
  const base =
    'inline-block rounded px-1 mx-0.5 transition-all duration-150 select-none whitespace-pre';
  const active = isCurrent ? 'bg-yellow-400/30 text-yellow-100 ring-1 ring-yellow-400/50' : '';

  if (!showClozeMode || !isCloze) {
    return <span className={`${base} ${active} hover:bg-white/5`}>{word.token}</span>;
  }

  if (revealed) {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`${base} bg-green-500/20 text-green-300 border border-green-500/40 cursor-pointer ${active}`}
      >
        {word.token}
      </span>
    );
  }

  const cleanLen = word.token.trim().replace(/[^\p{L}\p{N}]/gu, '').length;
  const blanks = '_'.repeat(Math.max(cleanLen, 2));

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`${base} bg-primary/30 text-transparent border-b-2 border-primary hover:bg-primary/50 font-mono tracking-widest cursor-pointer ${active}`}
    >
      {blanks}
    </span>
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

  const [loading, setLoading] = useState(true);
  const [transcriptInfo, setTranscriptInfo] = useState<TranscriptInfo | null>(null);
  const [rawSegments, setRawSegments] = useState<TranscriptSegment[]>([]);
  const [clozeSegments, setClozeSegments] = useState<ClozeSegment[]>([]);

  const [currentTime, setCurrentTime] = useState(0);
  const [seed, setSeed] = useState(() => Date.now());
  const [clozeOpts, setClozeOpts] = useState<BlockClozeOptions>(DEFAULT_CLOZE_OPTS);
  const [showClozeMode, setShowClozeMode] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeSegRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const [info, data] = await Promise.all([
          getTranscriptInfo(id),
          getTranscriptData(id),
        ]);
        if (!info || !data) throw new Error('Missing');
        setTranscriptInfo(info);
        setRawSegments(data.segments);
      } catch {
        toast.error('Không thể tải transcript');
        navigate('/youtube');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

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

  const handleToggle = (segIdx: number, wordIdx: number) => {
    setClozeSegments((prev) =>
      prev.map((seg, i) =>
        i !== segIdx
          ? seg
          : {
              ...seg,
              tokens: seg.tokens.map((t) =>
                t.wordIndex === wordIdx ? { ...t, revealed: !t.revealed } : t,
              ),
            },
      ),
    );
  };

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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const leftPane = (
    <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-background">
      <div className="rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        <VideoPlayer
          url={transcriptInfo?.resource_url || ''}
          onTimeUpdate={setCurrentTime}
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
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {clozeSegments.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Không có segment nào.
          </div>
        ) : (
          <div className="space-y-6">
            {clozeSegments.map((cs, si) => (
              <div
                key={si}
                ref={si === activeSegIdx ? activeSegRef : null}
                className={`transition-all duration-300 p-4 rounded-xl border-l-4 ${
                  si === activeSegIdx
                    ? 'bg-primary/5 border-primary shadow-sm'
                    : 'border-transparent opacity-70'
                }`}
              >
                <p className="flex flex-wrap items-center leading-[2.2] text-base">
                  {cs.tokens.map((ct, ti) => (
                    <ClozeWord
                      key={ti}
                      ct={ct}
                      showClozeMode={showClozeMode}
                      isCurrent={
                        si === activeSegIdx &&
                        ct.word.start !== null &&
                        ct.word.end !== null &&
                        currentTime >= ct.word.start &&
                        currentTime <= ct.word.end
                      }
                      onToggle={() => handleToggle(si, ct.wordIndex)}
                    />
                  ))}
                </p>
              </div>
            ))}
            <div className="h-32" />
          </div>
        )}
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
            <Button
              variant="outline"
              className="w-full justify-start h-9 gap-2"
              onClick={() => setSeed(Date.now())}
            >
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
              Ẩn N token liên tiếp rồi hiện M token — cả N và M đều ngẫu nhiên trong khoảng min/max.
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
