import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  loadReviewSession,
  saveCardReview,
  type CardWithSrsResponse,
  type ReviewSessionWithSrsResponse,
} from '@/lib/api/flashcard';
import {
  Rating,
  makeFsrs,
  fromApiCard,
  reviewCard,
  toReviewRequest,
  isDueWithinDay,
  toSrsData,
  formatDueIn,
} from '@/lib/srs/scheduler';
import { useUserSettings } from '@/lib/settings';
import { translate } from '@/lib/i18n-runtime';
import { CardRenderer } from '@/components/flashcard/cards/CardRenderer';

/**
 * Module scope, so the array identity stays stable for `previews`. Labels are
 * stored as i18n keys and resolved at render time instead of at import time.
 */
const RATING_BUTTONS: {
  rating: Rating;
  labelKey: string;
  shortcut: string;
  className: string;
}[] = [
  { rating: Rating.Again, labelKey: 'review.again', shortcut: '1', className: 'border-red-500/40 text-red-600 hover:bg-red-500/10' },
  { rating: Rating.Hard, labelKey: 'review.hard', shortcut: '2', className: 'border-orange-500/40 text-orange-600 hover:bg-orange-500/10' },
  { rating: Rating.Good, labelKey: 'review.good', shortcut: '3', className: 'border-green-500/40 text-green-600 hover:bg-green-500/10' },
  { rating: Rating.Easy, labelKey: 'review.easy', shortcut: '4', className: 'border-blue-500/40 text-blue-600 hover:bg-blue-500/10' },
];

interface SessionStats {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

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
  const { t } = useTranslation('flashcard');

  const [queue, setQueue] = useState<CardWithSrsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 });

  const { settings } = useUserSettings();
  const scheduler = settings.scheduler;
  const batchSize = settings.reviewBatchSize;

  // Rebuild the FSRS instance whenever the user's scheduler config changes.
  const fsrs = useMemo(() => makeFsrs(scheduler), [scheduler]);

  const load = useCallback(async () => {
    if (!deckId) return;
    try {
      setLoading(true);
      const session: ReviewSessionWithSrsResponse = await loadReviewSession(deckId, batchSize);
      setQueue(session.cards);
      setRevealed(false);
    } catch {
      // `translate` (not `t`) keeps `load` stable so a language change does not
      // restart the review session.
      toast.error(translate('flashcard:review.loadFailed', 'Không tải được phiên ôn tập'));
    } finally {
      setLoading(false);
    }
  }, [deckId, batchSize]);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue[0] ?? null;

  /** The ts-fsrs card for the card on top of the queue. */
  const currentFsrsCard = useMemo(
    () => (current ? fromApiCard(current, new Date()) : null),
    [current],
  );

  /** Real "due in" preview per rating, straight from the scheduler. */
  const previews = useMemo(() => {
    if (!currentFsrsCard) return {} as Record<Rating, string>;
    const now = new Date();
    const out = {} as Record<Rating, string>;
    for (const { rating } of RATING_BUTTONS) {
      try {
        out[rating] = formatDueIn(reviewCard(currentFsrsCard, rating, now, fsrs), now);
      } catch {
        out[rating] = '';
      }
    }
    return out;
  }, [currentFsrsCard, fsrs]);

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!current || !currentFsrsCard || submitting) return;
      try {
        setSubmitting(true);
        const now = new Date();
        const next = reviewCard(currentFsrsCard, rating, now, fsrs);

        // Persist immediately, never batched to session end (§5.8).
        await saveCardReview(current.id, toReviewRequest(next).card);

        const statKey =
          rating === Rating.Again
            ? 'again'
            : rating === Rating.Hard
              ? 'hard'
              : rating === Rating.Good
                ? 'good'
                : 'easy';
        setStats((s) => ({ ...s, reviewed: s.reviewed + 1, [statKey]: s[statKey] + 1 }));

        // Advance: pop the card unless it's still due within the day, in which
        // case re-queue it with the updated FSRS state so learning steps keep
        // progressing until it graduates past today.
        setQueue((prev) => {
          const rest = prev.slice(1);
          if (isDueWithinDay(next, now)) {
            return [...rest, { ...current, srs_data: toSrsData(next) }];
          }
          return rest;
        });
        setRevealed(false);
      } catch {
        // One-shot toast: resolved via `translate` so `handleRate` (and the
        // keydown listener that depends on it) keeps a stable identity.
        toast.error(translate('flashcard:review.saveFailed', 'Lưu kết quả thất bại'));
      } finally {
        setSubmitting(false);
      }
    },
    [current, currentFsrsCard, fsrs, submitting],
  );

  // Keyboard shortcuts: Space/Enter reveals, 1-4 grades.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (submitting) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (!revealed || !current) return;
      const map: Record<string, Rating> = {
        '1': Rating.Again,
        '2': Rating.Hard,
        '3': Rating.Good,
        '4': Rating.Easy,
      };
      const r = map[e.key];
      if (r) {
        e.preventDefault();
        void handleRate(r);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [revealed, submitting, current, handleRate]);

  if (loading && queue.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="p-6 max-w-md mx-auto min-h-screen flex flex-col items-center justify-center text-center gap-4" data-testid="review-done">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold">{t('review.complete')}</h2>
        <p className="text-sm text-muted-foreground">{t('review.completeDesc')}</p>
        {stats.reviewed > 0 && (
          <div className="grid grid-cols-4 gap-2 w-full text-xs">
            {[
              [t('review.again'), stats.again, 'text-red-500'],
              [t('review.hard'), stats.hard, 'text-orange-500'],
              [t('review.good'), stats.good, 'text-green-500'],
              [t('review.easy'), stats.easy, 'text-blue-500'],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-md border p-2">
                <p className={`text-base font-bold ${c}`}>{v as number}</p>
                <p className="text-[10px] uppercase">{l}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate('/flashcard')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> {t('review.back')}
          </Button>
          <Button onClick={load} className="gap-1.5">
            <Sparkles className="w-4 h-4" /> {t('review.continue')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto min-h-screen flex flex-col" data-testid="review-page">
      <div className="flex items-center justify-between mb-6 gap-2">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/flashcard')}>
          <ArrowLeft className="w-4 h-4" /> {t('review.exit')}
        </Button>
        <div className="flex gap-2 text-xs">
          <span className="text-muted-foreground">{t('review.reviewed')}{stats.reviewed}</span>
          <span className="font-mono px-1.5 py-0.5 rounded bg-muted">{current.card_type}</span>
        </div>
      </div>

      <CardRenderer
        card={current}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onSpeak={speak}
      />

      {revealed && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {RATING_BUTTONS.map((b) => (
            <Button
              key={b.rating}
              variant="outline"
              size="lg"
              disabled={submitting}
              className={`flex flex-col h-auto py-3 ${b.className}`}
              onClick={() => void handleRate(b.rating)}
              data-testid={`rate-${b.rating}-btn`}
            >
              <span className="text-base font-bold">{t(b.labelKey)}</span>
              <span className="text-[10px] opacity-70">
                {previews[b.rating] ? `${previews[b.rating]} · ` : ''}[{b.shortcut}]
              </span>
            </Button>
          ))}
        </div>
      )}

      {!revealed && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lightbulb className="w-3 h-3" />
          {t('review.hint')}
        </div>
      )}

      {revealed && (
        <Button variant="ghost" size="sm" className="mt-2 mx-auto gap-1.5" onClick={() => setRevealed(false)}>
          <EyeOff className="w-3 h-3" /> {t('review.hideAgain')}
        </Button>
      )}
    </div>
  );
}
