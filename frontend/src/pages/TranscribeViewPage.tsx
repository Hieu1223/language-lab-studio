import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, ChevronRight, ChevronLeft, RefreshCw, Eye, EyeOff, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  getTranscriptInfo,
  getTranscriptData,
  type TranscriptSegment,
  type TranscriptInfo,
} from '@/lib/api/transcription-real';

// ─── Types ─────────────────────────────────────────────────────────────

type SegmentWord = TranscriptSegment['words'][number];

interface ClozeToken {
  word: SegmentWord;
  isCloze: boolean;
  revealed: boolean;
  wordIndex: number;
}

interface ClozeSegment {
  segment: TranscriptSegment;
  tokens: ClozeToken[];
}

interface ClozeOptions {
  density: number;
  minChars: number;
}

// ─── Cloze Logic (Fixed) ────────────────────────────────────────────────────────

function generateClozeData(
  segments: TranscriptSegment[],
  opts: ClozeOptions,
  seed: number,
): ClozeSegment[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };

  let totalClozeCount = 0;

  const result = segments.map((seg) => {
    const tokens: ClozeToken[] = seg.words.map((word, wordIndex) => {
      // 1. Clean the word: remove punctuation and whitespace
      const cleanWord = word.token.trim().replace(/[^a-zA-Z0-9]/g, '');
      
      // 2. Eligibility Check: 
      // Must have a timestamp AND meet the length requirement
      const isEligible = 
        word.start !== null && 
        word.end !== null && 
        cleanWord.length >= opts.minChars;

      // 3. Randomize
      const isCloze = isEligible && rand() < opts.density;
      
      if (isCloze) totalClozeCount++;

      return {
        word,
        isCloze,
        revealed: false,
        wordIndex,
      };
    });

    return { segment: seg, tokens };
  });

  console.log(`Cloze Generation: ${totalClozeCount} words hidden using density ${opts.density}`);
  return result;
}

// ─── Sub-component: The Individual Word ────────────────────────────────────────

interface ClozeWordProps {
  ct: ClozeToken;
  isCurrent: boolean;
  onToggle: () => void;
  showClozeMode: boolean;
}

function ClozeWord({ ct, isCurrent, onToggle, showClozeMode }: ClozeWordProps) {
  const { word, isCloze, revealed } = ct;

  // Base styling
  const baseClasses = "inline-block rounded px-1 transition-all duration-150 select-none cursor-pointer mx-0.5 whitespace-pre";
  const activeClass = isCurrent ? "bg-yellow-400/30 text-yellow-100 ring-1 ring-yellow-400/50" : "";

  // Logic Tree:
  // 1. If Cloze Mode is completely OFF -> Show word
  // 2. If Word is NOT a cloze target -> Show word
  // 3. If Cloze is ON + Word is target + Already Revealed -> Show word (with "revealed" styling)
  // 4. Otherwise -> Hide it!

  if (!showClozeMode || !isCloze) {
    return (
      <span className={`${baseClasses} ${activeClass} hover:bg-white/10`}>
        {word.token}
      </span>
    );
  }

  if (revealed) {
    return (
      <span
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`${baseClasses} bg-green-500/20 text-green-300 border border-green-500/40 ${activeClass}`}
      >
        {word.token}
      </span>
    );
  }

  // HIDDEN STATE
  const cleanLength = word.token.trim().replace(/[^a-zA-Z0-9]/g, '').length;
  const blanks = "_".repeat(Math.max(cleanLength, 2));

  return (
    <span
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`${baseClasses} bg-primary/30 text-transparent border-b-2 border-primary hover:bg-primary/50 font-mono tracking-widest ${activeClass}`}
    >
      {blanks}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TranscribeViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data State
  const [loading, setLoading] = useState(true);
  const [transcriptInfo, setTranscriptInfo] = useState<TranscriptInfo | null>(null);
  const [rawSegments, setRawSegments] = useState<TranscriptSegment[]>([]);
  const [clozeSegments, setClozeSegments] = useState<ClozeSegment[]>([]);
  
  // Interaction State
  const [currentTime, setCurrentTime] = useState(0);
  const [seed, setSeed] = useState(() => Date.now());
  const [clozeOptions, setClozeOptions] = useState<ClozeOptions>({ density: 0.4, minChars: 3 });
  const [showClozeMode, setShowClozeMode] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegRef = useRef<HTMLDivElement>(null);

  // Load Initial Data
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const [info, data] = await Promise.all([
          getTranscriptInfo(id),
          getTranscriptData(id),
        ]);
        if (!info || !data) throw new Error("Data missing");
        
        setTranscriptInfo(info);
        console.log(data)
        setRawSegments(data.segments);
        // Force initial generation
        setClozeSegments(generateClozeData(data.segments, clozeOptions, seed));
      } catch (e) {
        toast.error("Failed to load transcript");
        navigate('/youtube');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Sync Cloze Data when settings or raw segments change
  useEffect(() => {
    if (rawSegments.length > 0) {
      const newData = generateClozeData(rawSegments, clozeOptions, seed);
      setClozeSegments(newData);
      setAllRevealed(false);
    }
  }, [clozeOptions, seed, rawSegments]);

  // Actions
  const handleToggleToken = (segIdx: number, wordIdx: number) => {
    setClozeSegments(prev => prev.map((cs, si) => 
      si !== segIdx ? cs : {
        ...cs,
        tokens: cs.tokens.map(t => 
          t.wordIndex === wordIdx ? { ...t, revealed: !t.revealed } : t
        )
      }
    ));
  };

  const handleToggleAll = () => {
    const nextState = !allRevealed;
    setClozeSegments(prev => prev.map(cs => ({
      ...cs,
      tokens: cs.tokens.map(t => t.isCloze ? { ...t, revealed: nextState } : t)
    })));
    setAllRevealed(nextState);
  };

  // Find Active Segment
  const activeSegIdx = useMemo(() => {
    return rawSegments.findIndex(seg => {
      const timed = seg.words.filter(w => w.start !== null);
      if (timed.length === 0) return false;
      return currentTime >= (timed[0].start ?? 0) && currentTime <= (timed[timed.length - 1].end ?? 0);
    });
  }, [rawSegments, currentTime]);

  useEffect(() => {
    if (autoScroll && activeSegRef.current) {
      activeSegRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSegIdx, autoScroll]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-6 bg-card shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/youtube')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="font-bold truncate max-w-sm text-sm">{transcriptInfo?.original_source}</h1>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Cloze Master</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-lg border">
            <Button 
              variant={showClozeMode ? "default" : "ghost"} 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => setShowClozeMode(true)}
            >
              Study
            </Button>
            <Button 
              variant={!showClozeMode ? "default" : "ghost"} 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => setShowClozeMode(false)}
            >
              Read
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 relative bg-muted/20">
        
        {/* Left Section: Video */}
        <section className="flex flex-col gap-4 w-1/2 min-w-[400px]">
          <div className="rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl ring-1 ring-white/10">
            <VideoPlayer 
              url={transcriptInfo?.resource_url || ''} 
              onTimeUpdate={setCurrentTime} 
            />
          </div>
          
          <div className="bg-card border rounded-2xl p-5 flex-1 shadow-sm overflow-hidden flex flex-col">
             <h3 className="text-xs font-bold mb-3 text-primary uppercase tracking-tighter">Transcript Metadata</h3>
             <div className="text-sm space-y-2 text-muted-foreground overflow-y-auto">
                <p><span className="text-foreground font-medium">Source:</span> {transcriptInfo?.original_source}</p>
                <p><span className="text-foreground font-medium">ID:</span> {id}</p>
             </div>
          </div>
        </section>

        {/* Center Section: Transcript Scroll */}
        <section className="flex-1 flex flex-col bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-muted-foreground">Live Transcript</span>
            <div className="flex items-center gap-4">
               <label className="flex items-center gap-2 text-[11px] font-medium cursor-pointer">
                 <input 
                   type="checkbox" 
                   checked={autoScroll} 
                   onChange={e => setAutoScroll(e.target.checked)} 
                   className="w-3 h-3 accent-primary"
                 />
                 Auto-Scroll
               </label>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
            {clozeSegments.map((cs, si) => (
              <div 
                key={si} 
                ref={si === activeSegIdx ? activeSegRef : null}
                className={`transition-all duration-500 p-6 rounded-xl border-l-4 ${
                  si === activeSegIdx 
                    ? 'bg-primary/5 border-primary shadow-sm' 
                    : 'border-transparent opacity-60'
                }`}
              >
                <p className="flex flex-wrap items-center leading-[2.2] text-lg">
                  {cs.tokens.map((ct, ti) => (
                    <ClozeWord
                      key={ti}
                      ct={ct}
                      showClozeMode={showClozeMode}
                      isCurrent={si === activeSegIdx && currentTime >= (ct.word.start || 0) && currentTime <= (ct.word.end || 0)}
                      onToggle={() => handleToggleToken(si, ct.wordIndex)}
                    />
                  ))}
                </p>
              </div>
            ))}
            <div className="h-40" /> {/* Bottom Padding for scroll */}
          </div>
        </section>

        {/* Right Panel Toggle Overlay */}
        {!rightPanelOpen && (
          <Button
            variant="default"
            size="icon"
            className="absolute right-8 bottom-8 rounded-full shadow-2xl z-50 h-12 w-12"
            onClick={() => setRightPanelOpen(true)}
          >
            <SettingsIcon className="w-5 h-5" />
          </Button>
        )}

        {/* Right Section: Settings Sidebar */}
        {rightPanelOpen && (
          <aside className="w-80 bg-card border rounded-2xl p-6 flex flex-col gap-8 shadow-xl animate-in slide-in-from-right duration-300 z-20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-primary" /> Exercise Settings
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightPanelOpen(false)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-8">
              {/* Density Setting */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Density</label>
                  <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{Math.round(clozeOptions.density * 100)}%</span>
                </div>
                <Slider 
                  value={[clozeOptions.density * 100]}
                  max={90} min={5} step={5}
                  onValueChange={([v]) => setClozeOptions(prev => ({ ...prev, density: v / 100 }))}
                />
                <p className="text-[10px] text-muted-foreground leading-tight">Controls what percentage of words are blanked out.</p>
              </div>

              {/* Word Length Setting */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Complexity</label>
                  <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{clozeOptions.minChars}+ chars</span>
                </div>
                <Slider 
                  value={[clozeOptions.minChars]}
                  max={12} min={1} step={1}
                  onValueChange={([v]) => setClozeOptions(prev => ({ ...prev, minChars: v }))}
                />
                <p className="text-[10px] text-muted-foreground leading-tight">Only words longer than this will be hidden.</p>
              </div>

              {/* Bulk Actions */}
              <div className="grid grid-cols-1 gap-3 pt-4 border-t">
                <Button variant="outline" className="w-full justify-start h-10 gap-3" onClick={() => setSeed(Date.now())}>
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span className="text-xs">Reshuffle Blanks</span>
                </Button>
                <Button variant="outline" className="w-full justify-start h-10 gap-3" onClick={handleToggleAll}>
                  {allRevealed ? <EyeOff className="w-4 h-4 text-orange-500" /> : <Eye className="w-4 h-4 text-green-500" />}
                  <span className="text-xs">{allRevealed ? "Hide All Words" : "Reveal All Words"}</span>
                </Button>
              </div>
            </div>

            <div className="mt-auto bg-primary/5 rounded-xl p-4 border border-primary/10">
              <h4 className="text-[10px] font-bold uppercase mb-2 text-primary">How to practice:</h4>
              <ul className="text-[10px] space-y-2 text-muted-foreground list-disc pl-3">
                <li>Listen to the audio carefully.</li>
                <li>Try to guess the missing words as they play.</li>
                <li>Click a blank to check your answer.</li>
              </ul>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}