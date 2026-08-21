import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react';

import { VideoPlayer } from '@/components/video/VideoPlayer';
import { ClozeWord } from '@/components/transcription/ClozeWord';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  getTranscriptionDetail,
  requestTranscription,
  type TranscriptSegment,
  type TranscriptDetailResponse,
} from '@/lib/api/transcription';
import {
  generateClozeData,
  type ClozeOptions,
  type ClozeSegment,
} from '@/lib/cloze-word';

import { useAuth } from '@/lib/auth-context';

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function TranscribeViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation('transcription');

  const [loading, setLoading] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const [transcriptInfo, setTranscriptInfo] =
    useState<TranscriptDetailResponse | null>(null);

  const [rawSegments, setRawSegments] = useState<TranscriptSegment[]>([]);
  const [clozeSegments, setClozeSegments] = useState<ClozeSegment[]>([]);

  const [currentTime, setCurrentTime] = useState(0);
  const [seed, setSeed] = useState(() => Date.now());

  const [clozeOptions, setClozeOptions] = useState<ClozeOptions>({
    density: 0.4,
    minChars: 3,
  });

  const [showClozeMode, setShowClozeMode] = useState(true);
  const [allRevealed, setAllRevealed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const activeRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────
  // Load transcript
  // ─────────────────────────────
  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);

        const info = await getTranscriptionDetail(id);
        if (!info) return;

        setTranscriptInfo(info);
        const segments = info.data?.segments ?? [];
        setRawSegments(segments);
        setClozeSegments(generateClozeData(segments, clozeOptions, seed));
      } catch {
        toast.error(t('legacy.loadFailed'));
        navigate('/youtube');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ─────────────────────────────
  // Sync cloze settings
  // ─────────────────────────────
  useEffect(() => {
    if (rawSegments.length) {
      setClozeSegments(
        generateClozeData(rawSegments, clozeOptions, seed),
      );
      setAllRevealed(false);
    }
  }, [clozeOptions, seed, rawSegments]);

  // ─────────────────────────────
  // Transcription request (CLEAN)
  // OAuth is handled inside API layer
  // ─────────────────────────────
  const handleStartTranscription = async () => {
    if (!user?.id || !id) return;

    try {
      setIsTranscribing(true);

      await requestTranscription(transcriptInfo?.video_id ?? id);

      toast.success(t('legacy.started'));

      // simple polling
      for (let i = 0; i < 10; i++) {
        const info = await getTranscriptionDetail(id);
        if (info?.done || info?.data?.segments?.length) {
          setTranscriptInfo(info);
          const segments = info.data?.segments ?? [];
          setRawSegments(segments);
          setClozeSegments(generateClozeData(segments, clozeOptions, seed));
          break;
        }

        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch {
      toast.error(t('legacy.serverError'));
    } finally {
      setIsTranscribing(false);
    }
  };

  // ─────────────────────────────
  // Toggle
  // ─────────────────────────────
  const handleToggle = (segIdx: number, wordIdx: number) => {
    setClozeSegments((prev) =>
      prev.map((seg, i) =>
        i !== segIdx
          ? seg
          : {
              ...seg,
              tokens: seg.tokens.map((t) =>
                t.wordIndex === wordIdx
                  ? { ...t, revealed: !t.revealed }
                  : t,
              ),
            },
      ),
    );
  };

  const activeSegIdx = useMemo(() => {
    return rawSegments.findIndex((seg) => {
      const w = seg.words.filter((x) => x.start !== null);
      if (!w.length) return false;

      return (
        currentTime >= (w[0].start ?? 0) &&
        currentTime <= (w[w.length - 1].end ?? 0)
      );
    });
  }, [rawSegments, currentTime]);

  useEffect(() => {
    if (autoScroll && activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegIdx]);

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-14 border-b flex items-center px-4 justify-between">
        <Button onClick={() => navigate('/youtube')} variant="ghost">
          <ArrowLeft />
        </Button>

        <div className="text-sm font-bold">
          {transcriptInfo?.original_source}
        </div>

        <Button onClick={() => setShowClozeMode((p) => !p)}>
          {showClozeMode ? t('legacy.study') : t('legacy.read')}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* VIDEO */}
        <div className="w-1/2 p-4">
          <VideoPlayer
            url={`https://www.youtube.com/embed/${id}`}
            onTimeUpdate={setCurrentTime}
          />
        </div>

        {/* TRANSCRIPT */}
        <div className="flex-1 overflow-y-auto p-4">
          {clozeSegments.map((seg, si) => (
            <div
              key={si}
              ref={si === activeSegIdx ? activeRef : null}
              className="mb-6"
            >
              {seg.tokens.map((t, ti) => (
                <ClozeWord
                  key={ti}
                  ct={t}
                  isCurrent={si === activeSegIdx}
                  showClozeMode={showClozeMode}
                  onToggle={() => handleToggle(si, t.wordIndex)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* SIDEBAR */}
        {rightPanelOpen && (
          <div className="w-72 border-l p-4">
            <Button onClick={handleStartTranscription}>
              {t('legacy.start')}
            </Button>

            <Button
              variant="outline"
              onClick={() => setSeed(Date.now())}
              className="mt-2"
            >
              {t('legacy.shuffle')}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const next = !allRevealed;
                setAllRevealed(next);

                setClozeSegments((prev) =>
                  prev.map((s) => ({
                    ...s,
                    tokens: s.tokens.map((t) =>
                      t.isCloze
                        ? { ...t, revealed: next }
                        : t,
                    ),
                  })),
                );
              }}
              className="mt-2"
            >
              {t('legacy.toggleAll')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}