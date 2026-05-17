import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getNextCard,
  reviewCard,
  type CardResponse,
  type ReviewRating,
} from '@/lib/api/flashcard';

const RATING_BUTTONS: {
  rating: ReviewRating;
  label: string;
  shortcut: string;
  className: string;
  hint: string;
}[] = [
  {
    rating: 'again',
    label: 'Quên',
    shortcut: '1',
    className: 'border-red-500/40 text-red-600 hover:bg-red-500/10',
    hint: '< 1 phút',
  },
  {
    rating: 'hard',
    label: 'Khó',
    shortcut: '2',
    className: 'border-orange-500/40 text-orange-600 hover:bg-orange-500/10',
    hint: '~ 6 phút',
  },
  {
    rating: 'good',
    label: 'Tốt',
    shortcut: '3',
    className: 'border-green-500/40 text-green-600 hover:bg-green-500/10',
    hint: '~ 10 phút',
  },
  {
    rating: 'easy',
    label: 'Dễ',
    shortcut: '4',
    className: 'border-blue-500/40 text-blue-600 hover:bg-blue-500/10',
    hint: '~ 4 ngày',
  },
];

interface SessionStats {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

const INIT_STATS: SessionStats = {
  reviewed: 0,
  again: 0,
  hard: 0,
  good: 0,
  easy: 0,
};

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export default function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [card, setCard] = useState<CardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<SessionStats>(INIT_STATS);
  const [done, setDone] = useState(false);

  const fetchNext = async () => {
    if (!deckId) return;
    try {
      setLoading(true);
      const next = await getNextCard(deckId);
      if (!next) {
        setDone(true);
      } else {
        setCard(next);
        setRevealed(false);
      }
    } catch {
      toast.error('Không lấy được thẻ tiếp theo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const handleRate = async (rating: ReviewRating) => {
    if (!card) return;
    try {
      setSubmitting(true);
      await reviewCard(card.id, rating);
      setStats((s) => ({
        ...s,
        reviewed: s.reviewed + 1,
        [rating]: (s as unknown as Record<string, number>)[rating] + 1,
      }));
      await fetchNext();
    } catch {
      toast.error('Submit thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (submitting) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) setRevealed(true);
      } else if (revealed) {
        const map: Record<string, ReviewRating> = {
          '1': 'again',
          '2': 'hard',
          '3': 'good',
          '4': 'easy',
        };
        const r = map[e.key];
        if (r) {
          e.preventDefault();
          handleRate(r);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, submitting, card]);

  if (loading && !card) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (done || !card) {
    return (
      <div
        className="p-6 max-w-md mx-auto min-h-screen flex flex-col items-center justify-center text-center gap-4"
        data-testid="review-done"
      >
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold">Hoàn thành!</h2>
        <p className="text-sm text-muted-foreground">
          Bạn đã ôn xong các thẻ đến hạn cho hôm nay.
        </p>
        {stats.reviewed > 0 && (
          <div className="grid grid-cols-4 gap-2 w-full text-xs">
            {[
              ['Quên', stats.again, 'text-red-500'],
              ['Khó', stats.hard, 'text-orange-500'],
              ['Tốt', stats.good, 'text-green-500'],
              ['Dễ', stats.easy, 'text-blue-500'],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-md border p-2">
                <p className={`text-base font-bold ${c}`}>{v as number}</p>
                <p className="text-[10px] uppercase">{l}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate('/vocabulary')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại
          </Button>
          <Button onClick={fetchNext} className="gap-1.5">
            <Sparkles className="w-4 h-4" /> Tiếp tục
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 md:p-6 max-w-2xl mx-auto min-h-screen flex flex-col"
      data-testid="review-page"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => navigate('/vocabulary')}
        >
          <ArrowLeft className="w-4 h-4" /> Thoát
        </Button>
        <div className="flex gap-2 text-xs">
          <span className="text-muted-foreground">Đã ôn: {stats.reviewed}</span>
          <span className={`font-mono px-1.5 py-0.5 rounded bg-muted`}>
            {card.state}
          </span>
        </div>
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-2xl border bg-card p-8 flex flex-col items-center justify-center text-center gap-3"
        data-testid="review-card"
      >
        <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
          Mặt trước
        </span>
        <p className="text-5xl md:text-6xl font-bold font-japanese leading-tight">
          {card.word.word}
        </p>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => speak(card.word.word)}
          title="Phát âm"
        >
          <Volume2 className="w-4 h-4" />
        </Button>

        {revealed ? (
          <div className="space-y-2 mt-6 animate-fade-in" data-testid="card-back">
            <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">
              Mặt sau
            </span>
            {card.word.reading && (
              <p className="text-xl text-muted-foreground font-japanese">
                {card.word.reading}
              </p>
            )}
            <p className="text-xl font-medium leading-snug">{card.word.meaning}</p>
          </div>
        ) : (
          <Button
            size="lg"
            className="mt-8 gap-2"
            onClick={() => setRevealed(true)}
            data-testid="reveal-card-btn"
          >
            <Eye className="w-4 h-4" /> Hiện đáp án
            <span className="text-[10px] opacity-60 ml-2">[Space]</span>
          </Button>
        )}
      </div>

      {/* Rating */}
      {revealed && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {RATING_BUTTONS.map((b) => (
            <Button
              key={b.rating}
              variant="outline"
              size="lg"
              disabled={submitting}
              className={`flex flex-col h-auto py-3 ${b.className}`}
              onClick={() => handleRate(b.rating)}
              data-testid={`rate-${b.rating}-btn`}
            >
              <span className="text-base font-bold">{b.label}</span>
              <span className="text-[10px] opacity-70">
                {b.hint} · [{b.shortcut}]
              </span>
            </Button>
          ))}
        </div>
      )}

      {!revealed && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lightbulb className="w-3 h-3" />
          Mẹo: Phím Space để hiện đáp án, 1-4 để chấm điểm.
        </div>
      )}

      {revealed && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 mx-auto gap-1.5"
          onClick={() => setRevealed(false)}
        >
          <EyeOff className="w-3 h-3" /> Ẩn lại
        </Button>
      )}
    </div>
  );
}
