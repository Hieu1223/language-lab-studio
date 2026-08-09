import {
  FSRS,
  Rating,
  State,
  createEmptyCard,
  type Card,
  type FSRSParameters,
  type Grade,
} from 'ts-fsrs';

export { Rating, State };

export type { Card, FSRSParameters, Grade };

/**
 * User-level scheduler settings, edited on the Settings page and fed into
 * `makeFsrs`. Mirrors the `scheduler.*` section of the user settings blob.
 *
 * `learningSteps` / `relearningSteps` are part of the settings schema for
 * forward-compatibility; the core FSRS engine in ts-fsrs v4 derives its own
 * short-term step progression from `enable_short_term`, so they are persisted
 * but not passed to the engine constructor here.
 */
export interface SchedulerSettings {
  requestRetention: number;
  maximumInterval: number;
  learningSteps: string[];
  relearningSteps: string[];
  enableFuzz: boolean;
  enableShortTerm: boolean;
}

export const DEFAULT_SCHEDULER_SETTINGS: SchedulerSettings = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
  enableFuzz: false,
  enableShortTerm: true,
};

/** Build a typed ts-fsrs instance from (partial) user-level scheduler settings. */
export function makeFsrs(
  opts?: Partial<SchedulerSettings>,
): FSRS {
  const settings = { ...DEFAULT_SCHEDULER_SETTINGS, ...opts };
  const params: Partial<FSRSParameters> = {
    request_retention: settings.requestRetention,
    maximum_interval: settings.maximumInterval,
    enable_fuzz: settings.enableFuzz,
    enable_short_term: settings.enableShortTerm,
  };
  return new FSRS(params);
}

/**
 * The raw SRS fields the API stores per card. The authoritative scheduling
 * state is the serialized ts-fsrs `Card` inside `srs_data`; the denormalized
 * `srs_*` scalars are a best-effort mirror used for legacy cards.
 */
export interface ApiSrsFields {
  srs_queue?: number | null;
  srs_due?: number | null;
  srs_factor?: number | null;
  srs_left?: number | null;
  srs_ivl?: number | null;
  srs_reps?: number | null;
  srs_lapses?: number | null;
  srs_data?: string | null;
}

type DateInput = string | number | Date;

function toDate(value: DateInput | undefined, now: Date): Date {
  if (value === undefined || value === null) return now;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? now : d;
}

function normalizeState(value: unknown, fallback: State): State {
  if (typeof value === 'number') {
    const found = (Object.values(State) as number[]).includes(value)
      ? (value as State)
      : fallback;
    return found;
  }
  if (typeof value === 'string') {
    const byName = (Object.entries(State) as [string, State][]).find(
      ([name]) => name === value,
    );
    return byName ? byName[1] : fallback;
  }
  return fallback;
}

/**
 * Convert API SRS fields into a ts-fsrs `Card`. Prefers the serialized Card
 * in `srs_data`; falls back to reconstructing a best-effort Card from the
 * denormalized `srs_*` scalars for legacy cards.
 */
export function fromApiCard(api: ApiSrsFields, now: Date = new Date()): Card {
  if (api.srs_data) {
    try {
      const parsed = JSON.parse(api.srs_data) as Partial<Card> & {
        due?: DateInput;
        last_review?: DateInput;
        state?: unknown;
      };
      const card = createEmptyCard(now);
      const merged: Card = {
        ...card,
        ...parsed,
        due: toDate(parsed.due as DateInput | undefined, now),
        last_review: parsed.last_review
          ? toDate(parsed.last_review as DateInput, now)
          : parsed.last_review,
        state: normalizeState(parsed.state, State.New),
      } as Card;
      return merged;
    } catch {
      // fall through to scalar reconstruction
    }
  }

  const card = createEmptyCard(now);
  if (api.srs_reps != null) card.reps = api.srs_reps;
  if (api.srs_lapses != null) card.lapses = api.srs_lapses;
  if (api.srs_ivl != null) card.scheduled_days = api.srs_ivl;
  if (api.srs_factor != null) card.difficulty = api.srs_factor;
  if (api.srs_due != null) card.due = new Date(api.srs_due * 1000);
  if (api.srs_queue != null) {
    card.state = normalizeState(api.srs_queue, State.New);
  }
  return card;
}

/** Compute the next card state. The real FSRS math runs inside `instance.next`. */
export function reviewCard(
  card: Card,
  rating: Rating,
  now: Date = new Date(),
  instance: FSRS = makeFsrs(),
): Card {
  const record = instance.next(card, now, rating as unknown as Grade);
  return record.card;
}

/** Persist the whole ts-fsrs Card (backend stores it as its SrsCard). */
export function toReviewRequest(card: Card): { card: Record<string, unknown> } {
  return { card: card as unknown as Record<string, unknown> };
}

/** JSON-stringify the card for the `srs_data` blob. */
export function toSrsData(card: Card): string {
  return JSON.stringify(card);
}

/** True when the card's next due date is within the same day as `now`. */
export function isDueWithinDay(card: Card, now: Date = new Date()): boolean {
  const due = card.due instanceof Date ? card.due : new Date(card.due);
  if (Number.isNaN(due.getTime())) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  return due.getTime() >= startOfToday && due.getTime() < startOfTomorrow;
}

/** Human-readable "due in" label for the review session UI. */
export function formatDueIn(card: Card, now: Date = new Date()): string {
  const due = card.due instanceof Date ? card.due : new Date(card.due);
  const diffMs = due.getTime() - now.getTime();
  if (Number.isNaN(diffMs)) return 'unknown';
  if (diffMs <= 0) return 'now';
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

/** Create a brand-new empty card. */
export function newCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}
