import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestTranscription, getTranscript, getTranscriptData, generateClozeIndices, getDefaultClozeSettings, getDefaultVideoPlayerSettings } from '@/lib/api/transcription';
import { TranscriptStatus } from '@/lib/api/transcription';
import type { TranscriptSegment, TokenTimestamp, ClozeSettings, ClozeMode, VideoPlayerSettings, Transcript } from '@/lib/api/transcription';
import { lookupWord } from '@/lib/api/flashcard';
import { canSpendCredits, spendCredits } from '@/lib/api/common';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Eye, EyeOff, Repeat, Play, Pause, SkipBack, SkipForward, Settings, Plus, X, Loader2 } from 'lucide-react';

const USER_ID = 'current-user';

const CLOZE_MODE_INFO: Record<ClozeMode, { label: string; hint: string }> = {
  classic: { label: 'Classic', hint: 'Ẩn ngẫu nhiên các từ — luyện từ vựng tổng quát' },
  listening: { label: 'Luyện nghe', hint: 'Che từ đang đọc và xung quanh — tập trung luyện nghe' },
  reading: { label: 'Luyện đọc', hint: 'Chỉ hiện từ đang đọc — luyện đọc theo ngữ cảnh' },
};

export default function TranscribeViewPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clozeMode, setClozeMode] = useState(false);
  const [clozeSettings, setClozeSettings] = useState<ClozeSettings>(getDefaultClozeSettings());
  const [playerSettings, setPlayerSettings] = useState<VideoPlayerSettings>(getDefaultVideoPlayerSettings());
  const [clozeIndices, setClozeIndices] = useState<Set<string>>(new Set());
  const [loopSegmentIdx, setLoopSegmentIdx] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ word: string; reading: string; meaning: string; existsInFlashcards: boolean } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalDuration = segments.length > 0 ? (segments[segments.length - 1].words[segments[segments.length - 1].words.length - 1]?.end ?? 0) + 2 : 0;

  // Load existing transcript if available
  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    // Check if there's already a transcript for this video
    const mockTranscriptId = videoId === 'yt-1' ? 'tr-1' : videoId === 'yt-4' ? 'tr-2' : null;
    if (mockTranscriptId) {
      Promise.all([getTranscript(mockTranscriptId), getTranscriptData(mockTranscriptId)]).then(([t, d]) => {
        setTranscript(t);
        if (d) setSegments(d.segments);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [videoId]);

  const handleTranscribe = async () => {
    if (!videoId) return;
    const allowed = await canSpendCredits(USER_ID, 1);
    if (!allowed) return;
    setTranscribing(true);
    const result = await requestTranscription({
      name: `Transcript - ${videoId}`,
      resource_id: videoId,
      original_source: 'Youtube',
      public: false,
      thumbnail_url: '',
      resource_url: `https://youtube.com/watch?v=${videoId}`,
    });
    await spendCredits(USER_ID, 1);
    const t = await getTranscript(result.transcript_id);
    const d = await getTranscriptData(result.transcript_id);
    setTranscript(t);
    if (d) setSegments(d.segments);
    setTranscribing(false);
  };

  useEffect(() => {
    if (!clozeMode || segments.length === 0) return;
    const indices = generateClozeIndices(segments, clozeSettings, currentTime);
    setClozeIndices(indices);
  }, [clozeMode, clozeSettings, segments, clozeSettings.mode === 'classic' ? 'static' : currentTime]);

  const play = useCallback(() => {
    setIsPlaying(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentTime(prev => prev + 0.1);
    }, 100 / playerSettings.playbackRate);
  }, [playerSettings.playbackRate]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const seekForward = () => setCurrentTime(prev => Math.min(prev + playerSettings.seekDuration, totalDuration));
  const seekBackward = () => setCurrentTime(prev => Math.max(prev - playerSettings.seekDuration, 0));

  useEffect(() => {
    if (loopSegmentIdx === null || segments.length === 0) return;
    const seg = segments[loopSegmentIdx];
    const segEnd = seg.words[seg.words.length - 1]?.end ?? 0;
    const segStart = seg.words[0]?.start ?? 0;
    if (currentTime > segEnd + 0.5) setCurrentTime(segStart);
  }, [currentTime, loopSegmentIdx, segments]);

  useEffect(() => {
    const activeEl = document.querySelector('.active-token');
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentTime]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 0.1);
      }, 100 / playerSettings.playbackRate);
    }
  }, [playerSettings.playbackRate, isPlaying]);

  const jumpTo = (time: number | null) => {
    if (time === null) return;
    setCurrentTime(time);
    if (!isPlaying) play();
  };

  const isTokenActive = (word: TokenTimestamp) => {
    if (word.start === null || word.end === null) return false;
    return currentTime >= word.start && currentTime < word.end + 0.15;
  };

  const handleLookup = async (token: string) => {
    setLookupLoading(true);
    const result = await lookupWord(USER_ID, token);
    setLookupResult({ word: result.word, reading: result.reading, meaning: result.meaning, existsInFlashcards: result.existsInFlashcards });
    setLookupLoading(false);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="p-6 text-center">
      <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">Đang tải...</p>
    </div>
  );

  // No transcript yet - show video info and transcribe button
  if (segments.length === 0) return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Button>
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-display font-bold text-xl text-foreground mb-2">Video: {videoId}</h2>
        <p className="text-sm text-muted-foreground mb-6">Video chưa được phiên dịch. Ấn nút bên dưới để bắt đầu.</p>
        <Button onClick={handleTranscribe} disabled={transcribing} className="gap-2 rounded-xl font-bold">
          {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {transcribing ? 'Đang phiên dịch...' : 'Phiên dịch (1 credit)'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] md:h-screen animate-fade-in">
      {/* Left: Video Player */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Button>
        </div>

        <div className="flex-1 bg-foreground/5 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Video Player</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">{formatTime(currentTime)} / {formatTime(totalDuration)}</p>
          </div>
        </div>

        <div className="p-3 border-t border-border space-y-2">
          <Slider value={[currentTime]} max={totalDuration || 1} step={0.1} onValueChange={([v]) => setCurrentTime(v)} className="w-full" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={seekBackward} className="w-8 h-8 p-0"><SkipBack className="w-4 h-4" /></Button>
              <Button variant={isPlaying ? 'default' : 'outline'} size="sm" onClick={() => isPlaying ? pause() : play()} className="w-8 h-8 p-0">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={seekForward} className="w-8 h-8 p-0"><SkipForward className="w-4 h-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
              <select value={playerSettings.playbackRate} onChange={e => setPlayerSettings(prev => ({ ...prev, playbackRate: parseFloat(e.target.value) }))} className="text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}x</option>)}
              </select>
              <select value={playerSettings.seekDuration} onChange={e => setPlayerSettings(prev => ({ ...prev, seekDuration: parseInt(e.target.value) }))} className="text-xs bg-muted border border-border rounded px-1.5 py-0.5 text-foreground">
                {[3, 5, 10, 15, 30].map(s => <option key={s} value={s}>Tua {s}s</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Transcript + Settings */}
      <div className={`flex flex-col border-l border-border bg-card ${settingsOpen ? 'w-96' : 'w-80'} flex-shrink-0 transition-all`}>
        <div className="p-2 border-b border-border flex items-center gap-1 flex-wrap">
          <Button variant={clozeMode ? 'default' : 'outline'} size="sm" onClick={() => setClozeMode(!clozeMode)} className="gap-1 text-xs rounded-lg">
            {clozeMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} Cloze
          </Button>
          {loopSegmentIdx !== null && (
            <Button variant="destructive" size="sm" onClick={() => setLoopSegmentIdx(null)} className="gap-1 text-xs rounded-lg">
              <Repeat className="w-3 h-3" /> Bỏ lặp
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(!settingsOpen)} className="ml-auto w-7 h-7 p-0">
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>

        {settingsOpen ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Cài đặt Transcript</h3>
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(false)} className="w-6 h-6 p-0"><X className="w-3.5 h-3.5" /></Button>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">Chế độ Cloze</p>
              <div className="space-y-1.5">
                {(Object.keys(CLOZE_MODE_INFO) as ClozeMode[]).map(mode => (
                  <button key={mode} onClick={() => setClozeSettings(prev => ({ ...prev, mode }))} className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors ${clozeSettings.mode === mode ? 'bg-primary/10 border border-primary/30 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    <span className="font-bold">{CLOZE_MODE_INFO[mode].label}</span>
                    <p className="text-[10px] mt-0.5 opacity-80">{CLOZE_MODE_INFO[mode].hint}</p>
                  </button>
                ))}
              </div>
            </div>
            {clozeSettings.mode === 'classic' && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Từ trong cloze (min-max)</p>
                  <div className="flex gap-2">
                    <input type="number" min={1} max={5} value={clozeSettings.minWordsInCloze} onChange={e => setClozeSettings(prev => ({ ...prev, minWordsInCloze: +e.target.value }))} className="w-16 text-xs bg-muted border border-border rounded px-2 py-1 text-foreground" />
                    <input type="number" min={1} max={10} value={clozeSettings.maxWordsInCloze} onChange={e => setClozeSettings(prev => ({ ...prev, maxWordsInCloze: +e.target.value }))} className="w-16 text-xs bg-muted border border-border rounded px-2 py-1 text-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Khoảng cách giữa cloze (min-max)</p>
                  <div className="flex gap-2">
                    <input type="number" min={1} max={10} value={clozeSettings.minGapBetweenCloze} onChange={e => setClozeSettings(prev => ({ ...prev, minGapBetweenCloze: +e.target.value }))} className="w-16 text-xs bg-muted border border-border rounded px-2 py-1 text-foreground" />
                    <input type="number" min={1} max={20} value={clozeSettings.maxGapBetweenCloze} onChange={e => setClozeSettings(prev => ({ ...prev, maxGapBetweenCloze: +e.target.value }))} className="w-16 text-xs bg-muted border border-border rounded px-2 py-1 text-foreground" />
                  </div>
                </div>
              </div>
            )}
            {(clozeSettings.mode === 'listening' || clozeSettings.mode === 'reading') && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Độ rộng cửa sổ</p>
                  <Slider value={[clozeSettings.windowSize]} min={1} max={10} step={1} onValueChange={([v]) => setClozeSettings(prev => ({ ...prev, windowSize: v }))} />
                  <span className="text-[10px] text-muted-foreground">{clozeSettings.windowSize} từ</span>
                </div>
                {clozeSettings.mode === 'reading' && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Offset tâm</p>
                    <Slider value={[clozeSettings.windowOffset]} min={-5} max={5} step={0.5} onValueChange={([v]) => setClozeSettings(prev => ({ ...prev, windowOffset: v }))} />
                    <span className="text-[10px] text-muted-foreground">Offset: {clozeSettings.windowOffset}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {lookupResult && (
              <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1 relative">
                <Button variant="ghost" size="sm" onClick={() => setLookupResult(null)} className="absolute top-1 right-1 w-5 h-5 p-0"><X className="w-3 h-3" /></Button>
                <p className="font-bold text-foreground text-base">{lookupResult.word}</p>
                <p className="text-muted-foreground">{lookupResult.reading}</p>
                <p className="text-foreground">{lookupResult.meaning}</p>
                {lookupResult.existsInFlashcards ? (
                  <span className="text-[10px] text-primary font-bold">✓ Đã có trong flashcard</span>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1 text-[10px] mt-1 h-6">
                    <Plus className="w-3 h-3" /> Thêm vào flashcard
                  </Button>
                )}
              </div>
            )}
            {segments.map((seg, si) => (
              <div key={si} className={`p-3 rounded-xl border transition-all cursor-pointer ${loopSegmentIdx === si ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`} onClick={() => setLoopSegmentIdx(loopSegmentIdx === si ? null : si)}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground">{formatTime(seg.words[0]?.start ?? 0)}</span>
                  {loopSegmentIdx === si && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
                      <Repeat className="w-2.5 h-2.5 inline mr-0.5" />Lặp
                    </span>
                  )}
                </div>
                <p className="text-base leading-relaxed">
                  {seg.words.map((word, wi) => {
                    const key = `${si}-${wi}`;
                    const active = isTokenActive(word);
                    const hidden = clozeMode && clozeIndices.has(key);
                    return (
                      <span
                        key={wi}
                        onClick={e => { e.stopPropagation(); if (!hidden) { jumpTo(word.start); handleLookup(word.token); } }}
                        className={`inline-block transition-all cursor-pointer rounded px-0.5 ${active ? 'active-token bg-primary/20 text-primary font-bold scale-105' : ''} ${hidden ? 'bg-muted text-transparent select-none rounded-md mx-0.5' : 'hover:bg-muted/50'}`}
                      >
                        {hidden ? '████' : word.token}
                      </span>
                    );
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
