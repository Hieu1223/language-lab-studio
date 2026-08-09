import { describe, it, expect } from 'vitest';
import {
  Rating,
  State,
  makeFsrs,
  fromApiCard,
  toReviewRequest,
  toSrsData,
  isDueWithinDay,
  newCard,
  reviewCard,
  DEFAULT_SCHEDULER_SETTINGS,
} from '@/lib/srs/scheduler';

describe('lib/srs/scheduler.ts', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');

  it('makeFsrs honors user scheduler settings and returns an FSRS instance', () => {
    const fsrs = makeFsrs({ requestRetention: 0.85, maximumInterval: 100 });
    expect(fsrs).toBeDefined();
    expect((fsrs as any).parameters.request_retention).toBeCloseTo(0.85);
    expect((fsrs as any).parameters.maximum_interval).toBe(100);
  });

  it('newCard produces a New-state card', () => {
    const card = newCard(now);
    expect(card.state).toBe(State.New);
  });

  it('fromApiCard prefers the serialized Card in srs_data', () => {
    const inner = newCard(now);
    inner.state = State.Review;
    inner.stability = 12.5;
    const data = toSrsData(inner);

    const card = fromApiCard(
      { srs_queue: 0, srs_due: 0, srs_data: data },
      now,
    );
    expect(card.state).toBe(State.Review);
    expect(card.stability).toBeCloseTo(12.5);
  });

  it('fromApiCard falls back to scalars when srs_data is missing', () => {
    const card = fromApiCard(
      {
        srs_queue: State.Learning,
        srs_due: Math.floor(now.getTime() / 1000) + 60,
        srs_ivl: 4,
        srs_reps: 2,
        srs_lapses: 1,
      },
      now,
    );
    expect(card.state).toBe(State.Learning);
    expect(card.reps).toBe(2);
    expect(card.lapses).toBe(1);
    expect(card.scheduled_days).toBe(4);
  });

  it('does not default scalars to 0 when legitimately null on a brand-new card', () => {
    const card = fromApiCard({}, now);
    const fresh = newCard(now);
    expect(card.state).toBe(fresh.state);
  });

  it('reviewCard computes a valid next state for every Rating', () => {
    const fsrs = makeFsrs(DEFAULT_SCHEDULER_SETTINGS);
    for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      const card = reviewCard(fromApiCard({}, now), rating, now, fsrs);
      expect(card).toBeDefined();
      expect(typeof card.due).not.toBe('undefined');
    }
  });

  it('toReviewRequest wraps the entire fsrs Card', () => {
    const card = reviewCard(fromApiCard({}, now), Rating.Good, now, makeFsrs());
    const req = toReviewRequest(card);
    expect(req.card).toBeDefined();
    expect((req.card as any).state).toBe(card.state);
  });

  it('toSrsData round-trips into a parseable Card', () => {
    const card = reviewCard(fromApiCard({}, now), Rating.Good, now, makeFsrs());
    const parsed = JSON.parse(toSrsData(card));
    expect(parsed.state).toBeDefined();
  });

  it('isDueWithinDay is true for a due-soon card and false for a far one', () => {
    const soon = fromApiCard({ srs_due: Math.floor(now.getTime() / 1000) + 60 }, now);
    const far = fromApiCard({ srs_due: Math.floor(now.getTime() / 1000) + 86400 * 10 }, now);
    expect(isDueWithinDay(soon, now)).toBe(true);
    expect(isDueWithinDay(far, now)).toBe(false);
  });
});
