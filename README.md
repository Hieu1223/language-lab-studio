# Language Lab Studio

A desktop-first, lightweight React + Vite frontend for a Japanese learning
platform: server wake-up handling, auth, YouTube transcription with pluggable
review UIs (cloze / anki), manga reading with OCR overlay, dictionary /
tokenization lookup, user + per-transcription settings, and an FSRS-based SRS
flashcard system.

See [`doc/frontend-architecture (1).md`](doc/frontend-architecture%20(1).md) for
the full architecture, directory layout, and implementation plan.

## Key architecture points (per the doc)

- **SRS is computed on the frontend.** `src/lib/srs/scheduler.ts` wraps
  [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) and maps the
  API's `srs_*` fields to/from a ts-fsrs `Card` via `makeFsrs`, `fromApiCard`,
  `toReviewRequest`, `toSrsData`, `isDueWithinDay`, `newCard`. The backend is a
  dumb store; the frontend is authoritative for scheduling math.
- **Pluggable UI registries.** `src/lib/registry/createGlobRegistry.ts` +
  `ui-registry-contract.ts` implement the shared `meta.ts` + lazy-component
  pattern for transcription review UIs and flashcard card-types (see doc §4).
- **Cloze generation** (`src/lib/cloze-block.ts`) hides a random subset of
  word tokens per segment via `Math.random`, with click-to-seek on timestamps.
- **`/web-novel/*` is intentionally out of scope** — no API client wrapper and
  no pages exist for it (doc §6).

## Tech

Vite + React + TypeScript, React Router, TanStack Query, zod, ts-fsrs,
react-youtube. (Settings/state store and CSS-module styling follow the doc's
target architecture and are being migrated incrementally.)

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm test` — run the Vitest suite

## Tests

Vitest + React Testing Library. Scheduler and registry units live in
`src/test/`.
