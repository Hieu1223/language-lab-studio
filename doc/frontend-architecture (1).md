# Japanese Learning App — Frontend Architecture

## 1. Overview & Goals

A desktop-first, lightweight (minimal CSS, website-like rather than app-like) React + Vite frontend for a Japanese learning platform, covering: server wake-up handling, auth, video transcription with pluggable review UIs, manga reading with OCR overlay, dictionary/tokenization lookup, user + per-resource settings, and an SRS flashcard system. Mobile is explicitly out of scope for this codebase (separate codebase later); shared business logic should stay framework-light so it can eventually be reused there, but this is not a blocker for v1.

**Core design principles carried through this doc:**
- Minimal CSS footprint, CSS Modules per component, no CSS-in-JS runtime.
- Two structurally identical "pluggable UI" registries: one for transcription review UIs (cloze / anki), one for flashcard card-type renderers (vocab / grammar / sentence). Both use Vite's `import.meta.glob` + lazy loading + a `uiType`/`cardType` export contract.
- All scheduling (SRS) logic lives on the frontend; the backend only stores/returns whatever scheduling fields the frontend sends. Conflict resolution across devices is a backend concern — the frontend just sends its write and trusts whatever the server response contains. The scheduler is a **FSRS** implementation (frontend computes the next review via `lib/srs/scheduler.ts` and persists the result), configured through user-level scheduler settings.
- Frontend does not own the settings schema's evolution story blindly — every settings blob is versioned (`schemaVersion`) with per-domain migrations.

---

## 2. Tech Stack

- **Build tool:** Vite (React + TypeScript template)
- **Routing:** React Router (data router, for `useBlocker` on unsaved settings if the installed version supports it; otherwise manual dirty-flag confirm)
- **State:** Zustand (or Jotai) for cross-cutting state (auth, theme, video-panel visibility, active transcription settings); React Query (TanStack Query) for all server data (fetch/cache/mutate against the API below)
- **Styling:** CSS Modules (`*.module.css`), one file per component, no global stylesheet beyond resets/tokens
- **Video:** YouTube IFrame API (or `react-youtube` thin wrapper) kept mounted off-screen when hidden
- **HTTP client:** `fetch` wrapped in a small typed API client (see §6) with OAuth2 bearer token handling + refresh
- **i18n:** `react-i18next` + `i18next`, locale JSON files under `src/i18n/locales/` — scaffolded from the start (not retrofitted later) given UI copy needs to support both Vietnamese and English
- **Connectivity monitoring:** background `/ping` health check distinct from the landing page's cold-start loop (see §7.5)

---

## 3. Directory Structure

```
src/
  app/
    App.tsx                     # Router root, providers (QueryClient, AuthProvider, ThemeProvider)
    router.tsx                  # Route table
    providers/
      AuthProvider.tsx          # Token state, refresh scheduling, logout
      ThemeProvider.tsx         # Dark/light + accent color, applies CSS vars to :root
      QueryProvider.tsx         # TanStack Query client setup

  pages/
    landing/
      LandingPage.tsx           # Pings /ping until success, then redirects to /login
      LandingPage.module.css
    auth/
      LoginPage.tsx             # Login + "create account" toggle/tab, no marketing content
      LoginPage.module.css
      RegisterForm.tsx          # Sub-component for account creation
    transcription/
      TranscriptionListPage.tsx # Paste-link + preview + history list
      TranscriptionListPage.module.css
      TranscriptionViewPage.tsx # Hosts VideoPanel + ReviewUI (via registry) + Sidebar
      TranscriptionViewPage.module.css
      ui/
        types.ts                # ReviewUIProps contract
        settingsContext.tsx     # settings/update/patchUi context for review UIs
        registry.ts             # glob-based registry (see §4)
        cloze/
          meta.ts               # export const uiType = 'cloze'; export const label
          ClozeUI.tsx           # default export: component
          ClozeSettings.tsx     # UI-specific settings panel, rendered inside shared sidebar
          ClozeUI.module.css
          regenerateStore.ts    # zustand nonce store for "Regenerate" re-roll
        anki/
          meta.ts               # export const uiType = 'anki'; export const label
          AnkiUI.tsx            # default export: component; named export: `uiType = 'anki'`
          AnkiSettings.tsx
          AnkiUI.module.css
    manga/
      MangaSearchPage.tsx
      MangaDetailPage.tsx
      MangaReaderPage.tsx        # reader + OCR overlay + OCR text panel
      MangaReaderPage.module.css
      MangaHistoryPage.tsx
      components/
        OcrOverlay.tsx           # positions OCR boxes over the page image
        OcrTextPanel.tsx         # closable panel listing all OCR'd text for the page
    dictionary/
      DictionaryPage.tsx         # freeform text -> tokenize -> click token -> lookup
      DictionaryPage.module.css
    settings/
      SettingsPage.tsx           # user-level settings (theme, color, defaults)
      SettingsPage.module.css
    flashcard/
      DeckListPage.tsx           # deck list + stats (new/learning/review/due)
      DeckDetailPage.tsx         # cards in a deck, add/remove
      ReviewSessionPage.tsx      # loads batch, hosts CardRenderer (via registry)
      PublicDeckBrowserPage.tsx  # browse + copy public decks
      cards/
        CardRenderer.tsx         # picks registered renderer by card_type (safe fallback)
        Card.module.css
        registry.ts              # glob-based registry, mirrors transcription/ui/registry.ts
        vocab/
          meta.ts                # export const cardType = 'vocab'; export const labelKey
          VocabCard.tsx          # default export: component; named export: `cardType = 'vocab'`
        grammar/
          meta.ts                # export const cardType = 'grammar'
          GrammarCard.tsx        # named export: `cardType = 'grammar'`
        sentence/
          meta.ts                # export const cardType = 'sentence'
          SentenceCard.tsx       # named export: `cardType = 'sentence'`

  stores/                       # zustand cross-cutting UI state
    connectivityStore.ts        # status ('online' | 'offline'), checking, lastCheckedAt
    toastStore.ts               # toast.info/error/... surfaced by <Toaster />
    videoPanelStore.ts          # visible, source, seekNonce/seekTarget, playing

  common/
    components/
      Sidebar/
        Sidebar.tsx              # shared layout: video toggle, theme, mounts UI-specific settings slot
        Sidebar.module.css
      VideoPanel/
        VideoPanel.tsx           # always-mounted player; visibility toggled via CSS, never unmounted
        VideoPanel.module.css
      DictionaryLookupOverlay/
        LookupOverlay.tsx        # shared popover: single result inline, multi-result list
        LookupOverlay.module.css
        useLookup.ts             # hook: token click -> /tokenization/dictionary/words/lookup
      AddToDeckButton.tsx        # from lookup overlay, opens deck picker, calls add-vocab
      ConfirmDirtyNavigation.tsx # reusable "unsaved changes" guard (route + beforeunload)
      ConnectivityBanner/
        ConnectivityBanner.tsx   # non-blocking "can't reach server" banner + Retry button (see §7.5)
        ConnectivityBanner.module.css
      Spinner.tsx / EmptyState.tsx / ErrorBanner.tsx

  i18n/
    index.ts                     # i18next init, language detection/persistence
    locales/
      en/common.json
      vi/common.json             # namespaced per feature area if it grows (en/flashcard.json, etc.)

  lib/
    api/
      client.ts                  # fetch wrapper, base URL, bearer injection, 401 -> refresh -> retry
      auth.ts                    # POST /token, /token/refresh, /token/revoke
      user.ts                    # /user/register, /user/me, /user/settings
      transcription.ts           # all /transcription/* + /youtube/video/{id}
      manga.ts                   # all /manga/*
      dictionary.ts              # /tokenization/*
      flashcard.ts                # all /flashcard/*
    settings/
      schema.ts                  # SettingsDomain types + CURRENT_SCHEMA_VERSION per domain
      migrations.ts              # per-domain migration function maps
      validateOrDefault.ts       # parse+migrate+fallback-to-default logic
    srs/
      scheduler.ts               # frontend SRS scheduling algorithm (matches SaveReviewRequest fields)
      types.ts                   # local card review state shape
    registry/
      createGlobRegistry.ts      # shared generic helper used by BOTH transcription/ui and flashcard/cards
    ui-registry-contract.ts      # shared TS contract: { default: Component, <typeKey>: string }

  hooks/
    useVideoProgress.ts          # GET/POST /transcription/progress
    useDirty.ts                  # generic "has unsaved changes" state + warning wiring
    useTheme.ts
    useConnectivityMonitor.ts    # periodic /ping health check + retry, feeds ConnectivityBanner (see §7.5)

  styles/
    tokens.css                   # CSS custom properties: color scales, spacing, font stack
    reset.css                    # minimal reset only

  main.tsx
```

---

## 4. The Shared Registry Pattern (Transcription UIs & Card Types)

Both "pluggable UI" needs — transcription review UI (`cloze`/`anki`) and flashcard rendering (`vocab`/`grammar`/`sentence`) — use **the same generic mechanism**, implemented once in `lib/registry/createGlobRegistry.ts`, and instantiated twice.

### Contract every module must satisfy
```ts
// e.g. src/pages/transcription/ui/cloze/ClozeUI.tsx
export const uiType = 'cloze' as const;
export default function ClozeUI(props: ReviewUIProps) { ... }

// e.g. src/pages/flashcard/cards/vocab/VocabCard.tsx
export const cardType = 'vocab' as const;
export default function VocabCard(props: CardRendererProps) { ... }
```

### Generic registry factory
```ts
// lib/registry/createGlobRegistry.ts
export function createGlobRegistry<TKey extends string, TProps>(
  modules: Record<string, () => Promise<any>>,
  typeExportName: string // 'uiType' | 'cardType'
) {
  const lazyByType = new Map<TKey, React.LazyExoticComponent<React.ComponentType<TProps>>>();
  const eagerTypeList: TKey[] = [];

  for (const path in modules) {
    // Peek the type key by doing a one-time non-lazy resolution at registry-build time is not possible
    // with pure glob + lazy; instead, co-locate a lightweight manifest OR resolve eagerly once at boot.
  }

  return { get: (type: TKey) => lazyByType.get(type), list: () => eagerTypeList };
}
```
**Practical note:** `import.meta.glob` with `{ eager: true }` is needed to read the `uiType`/`cardType` string synchronously at registry-build time (you can't know the key without importing the module). To keep the *component* itself lazy while still knowing its type eagerly, split each module into two exports and glob twice, OR keep a tiny sibling `meta.ts` per UI/card folder (`export const uiType = 'cloze'`) that's imported eagerly (cheap, no component code), while the component itself is imported via `React.lazy(() => import('./ClozeUI'))`. This second approach is recommended — it avoids pulling any component code into the eager bundle:

```
ui/cloze/
  meta.ts        // export const uiType = 'cloze'; export const label = 'Cloze'
  ClozeUI.tsx     // heavy component, lazy-loaded
  ClozeSettings.tsx
```

```ts
// ui/registry.ts  (transcription — uses the shared createGlobRegistry helper)
const metaModules = import.meta.glob('./*/meta.ts', { eager: true })
const componentLoaders = import.meta.glob('./*/*UI.tsx')
const settingsLoaders = import.meta.glob('./*/*Settings.tsx')

export const reviewUiRegistry = createGlobRegistry<ReviewUIProps>({
  metaModules, componentLoaders, settingsLoaders,
  typeExportName: 'uiType',
  componentSuffix: 'UI',
  settingsSuffix: 'Settings',
})
```

The flashcard `cards/registry.ts` follows the **same `meta.ts` + lazy-renderer shape**
but resolves the map by hand (eager metas keyed by type, then `React.lazy` wrapping each
`*Card.tsx` loader) into `cardRegistry` with `getCardMeta` / `getCardRenderer` helpers.
The contract (`meta.ts` exporting `uiType`/`cardType` + a label, plus a default-export
component) is identical; the only difference is the transcription side delegates to
`createGlobRegistry` while the flashcard side inlines the resolution.

### Why this over raw `import.meta.glob(..., { eager: true })` on the component itself
Eager-importing the component defeats lazy loading (defeats the "lightweight" goal — cloze and anki UIs, and vocab/grammar/sentence card renderers, would all ship in the initial bundle). The `meta.ts` split keeps the registry's *shape* (what types exist, labels, icons) available synchronously for building tab/dropdown UI, while deferring the actual component code.

### Registration checklist for adding a new UI or card type
1. Create folder under `ui/<type>/` or `cards/<type>/`.
2. Add `meta.ts` exporting `uiType`/`cardType` + `label`.
3. Add `<Type>UI.tsx` / `<Type>Card.tsx` as default export.
4. Optionally add `<Type>Settings.tsx` for the shared sidebar slot.
5. No registry.ts edit needed — glob picks it up automatically.

---

## 5. Page-by-Page Behavior Spec

### 5.1 Landing (`pages/landing/LandingPage.tsx`)
- On mount, poll `GET /ping` (e.g. every 2s, backoff optional) until 200.
- Show a minimal "waking up server…" state — no branding/marketing copy.
- On success, `navigate('/login', { replace: true })`.
- No retry-forever trap: cap total wait (e.g. 90s) and show a manual "retry" if exceeded.

### 5.2 Auth (`pages/auth/LoginPage.tsx`)
- Single page, tab or toggle between "Log in" / "Create account" — no separate route needed, but `/register` alias can just render the same page with the toggle pre-set.
- Login: `POST /token` (OAuth2 password grant — form-encoded body per `Body_login_token_post`).
- Register: `POST /user/register` → on success, auto-login or route to login tab with prefilled username.
- Store access + refresh token via `AuthProvider`; schedule silent refresh via `POST /token/refresh` before expiry; `POST /token/revoke` on logout.

### 5.3 Transcription List (`pages/transcription/TranscriptionListPage.tsx`)
- Paste-link input → `GET /youtube/video/{video_id}` for preview (title, thumbnail, channel, duration, description, view count) before committing to a transcription job.
- "Transcribe" button → `POST /transcription/transcribe/youtube` (creates job, returns `transcript_id`).
- Visiting a video without transcribing (just watching) should call `POST /transcription/visit` to log it into history — this is the endpoint backing "history of visited videos," distinct from actual transcription jobs.
- History list → `GET /transcription/history` (paginated via `UserHistoryListResponse`); delete entry → `DELETE /transcription/history`.
- Each history/preview item shows `is_transcribed` to distinguish "watched only" vs "has a transcript."

### 5.4 Transcription View (`pages/transcription/TranscriptionViewPage.tsx`)
- Loads `GET /transcription/transcribe/{id}/detail` → `TranscriptDetailResponse` (status/done/msg for in-progress jobs, `video`, `data.segments[].words[]` with per-word timestamps, and `individual_settings` — the per-transcription settings blob).
- If `done: false`, poll or show progress state using `status`/`msg`.
- Renders `Sidebar` (shared) + `VideoPanel` (always mounted) + the active `ReviewUI` resolved via `reviewUiRegistry`.
- Individual (per-transcription) settings: loaded from `individual_settings` on the detail response, saved via `POST /transcription/transcribe/{id}/settings` with body `{ transcript_id, settings }`. New transcripts start from domain defaults (schemaVersion + default values), not copied from the last-used transcript, unless later decided otherwise.
- Video watch position persisted via `GET/POST /transcription/progress` keyed by `resource_id` + `original_source` — separate concern from UI settings; debounce POSTs (e.g. on pause / every N seconds), not on every timeupdate tick.
- "Rerun" action → `POST /transcription/transcribe/{id}/rerun`.

**Cloze UI (`ui/cloze/ClozeUI.tsx`):**
- On mount/regenerate, client-side randomly picks a subset of word tokens per segment to hide (pure `Math.random`, no persistence, no backend round-trip — "regenerate" is instant and local).
- Hover over hidden token → reveal (CSS-only or minimal JS state).
- Click token (revealed or not) → seek `VideoPanel` to that word's `start` time (from `TokenTimestamp`).
- "Regenerate" button in `ClozeSettings.tsx` re-rolls the hidden-word set.

**Anki UI (`ui/anki/AnkiUI.tsx`):**
- Segment-by-segment playback: repeat current segment, next, previous — driven by `TranscriptSegment.words[0].start` / last word's `end`.
- Click a word within the segment → seek video to that word's `start`.

### 5.5 Manga
- **Search:** `GET /manga/manga?q=` (paginated via `limit`/`offset`).
- **Detail:** `GET /manga/manga/{manga_id}` → chapters list.
- **Reader (`MangaReaderPage.tsx`):** `GET /manga/read/{chapter_id}` → `pages[]` (image URLs) + chapter/manga context + sibling chapters for prev/next nav. Standard reader controls (page nav, zoom, fit modes, direction) are purely client-side/local UI state — no dedicated API needed beyond page images.
- **OCR:**
  - `GET /manga/ocr/{chapter_id}` → `OCRResultResponse` with `ocr_data.pages[].blocks[]`, each block has `box` (pixel coords in the *source* image, per `img_width`/`img_height` on the page), `vertical`, `lines`, `lines_coords`.
  - **Store/scale as normalized coordinates:** convert `box`/`lines_coords` from source pixel space to a 0–1 fraction using the page's `img_width`/`img_height` at render time, so `OcrOverlay.tsx` repositions correctly under zoom/pan via CSS transforms without recomputation.
  - If no OCR exists yet, trigger it: `GET /manga/ocr/stream/{chapter_id}` is the SSE-style streaming endpoint — use it for "run OCR now" with live progress; the plain `GET /manga/ocr/{chapter_id}` is for fetching already-computed results.
  - `DELETE /manga/ocr/{chapter_id}` — reset/re-run trigger if user wants fresh OCR.
  - `OcrTextPanel.tsx` — closable panel listing all `lines` across blocks for the current page, independent of overlay visibility.
- **History:** `GET /manga/history`, upsert via `POST /manga/history` (`ReadHistoryUpdate`: manga_id, chapter_id, current_page), delete via `DELETE /manga/history/{history_id}` or by manga via `DELETE /manga/history/manga/{manga_id}`.
- **Dictionary lookup inside reader:** selecting/clicking OCR'd text reuses the shared `LookupOverlay` (see §5.6) — tokenize the OCR line text on the fly via `/tokenization/tokenize`, then per-token lookup.

### 5.6 Dictionary / Tokenization (`pages/dictionary/DictionaryPage.tsx`)
- **Not a live/type-ahead search.** Tokenization is triggered explicitly — a "Tokenize" button or Enter-to-submit on the textarea — not on every keystroke. This avoids firing `GET /tokenization/tokenize` on every character and matches the deliberate, read-a-passage-then-look-things-up workflow rather than an incremental search box. `useDebounce` (§6.5) is therefore *not* needed here; it stays reserved for the genuinely continuous inputs (settings autosave staging, video-progress writes).
- Freeform textarea → on submit, `GET /tokenization/tokenize?text=` → `TokenList` (each `Token` has `surface`, `begin`/`end` offsets, `word_id`, `pos`).
- Render text with each token as a clickable/highlighted span keyed by its `begin`/`end` offsets.
- Click token → `GET /tokenization/dictionary/words/lookup?q=<normalized or dictionary_form>` → `WordLookupResponse`.
  - `results.length === 1` → show inline immediately.
  - `results.length > 1` → show list (word + reading + meaning) in the shared `LookupOverlay`.
- The exact same `useLookup` hook + `LookupOverlay` component is reused from the transcription view (clicking a transcript word) and the manga reader (clicking OCR'd text) — this is the "shared lookup overlay" called out in §1.
- "Add to deck" action inside the overlay → opens a deck picker → `POST /flashcard/decks/{deck_id}/cards/vocab` with `{ word, meaning }`.

### 5.7 Settings (`pages/settings/SettingsPage.tsx`)
- Domains: **user/global** settings (`GET/POST /user/settings`, arbitrary `additionalProperties` object — theme, color, defaults for new transcriptions/decks, etc.) and **per-transcription** settings (see §5.4, separate endpoint, separate lifecycle — not edited from this page, only from the transcription view's sidebar).
- **schemaVersion:** every settings payload written to `localStorage`-adjacent app state and to the backend is wrapped as `{ schemaVersion: number, data: Settings }`. On load:
  1. Parse JSON. If it throws → use defaults for that domain, log a warning.
  2. If `schemaVersion` < current, run the domain's `migrations[v]` chain sequentially.
  3. If any migration step throws or the resulting shape fails a lightweight runtime check → fall back to defaults for the smallest affected sub-section possible (not the whole payload) where feasible.
- **Save button + dirty warning:** settings are edited in local component state, not auto-saved on every change. A `isDirty` flag flips on any change; `ConfirmDirtyNavigation` wires:
  - `beforeunload` listener for tab close/refresh.
  - A manual check in nav click handlers / route change effect showing `window.confirm` (or a small custom modal) for in-app navigation while dirty.
- "Save" → `POST /user/settings` with the full `{settings: {...}}` object (backend stores it opaquely, so the frontend owns and validates the whole shape).
- **Live-preview vs persist:** `theme`, `accentHue`, and `locale` apply **immediately** as a live preview (via `ThemeProvider` / `changeLocale`) on every change, then get persisted together with the rest on Save. The page computes `dirty` by re-validating the server blob and comparing JSON.
- **Sections rendered (actual):**
  - *Appearance* — `theme` (light/dark/system), `accentHue` (slider + swatch preview), `locale` (en/vi).
  - *Defaults* — `defaultReviewUi` (cloze/anki), `reviewBatchSize` (1–100), `showVideoByDefault`.
  - *Scheduler* (FSRS) — `scheduler.requestRetention`, `scheduler.maximumInterval`, `scheduler.learningSteps` (comma list), `scheduler.relearningSteps` (comma list), `scheduler.enableFuzz`, `scheduler.enableShortTerm`. These feed `makeFsrs` in the review session (see §6.6).

### 5.8 Flashcards
- **Deck list (`DeckListPage.tsx`):** `GET /flashcard/decks` → `DeckWithStatsResponse[]` (name, public, `stats.{new,learning,review,relearning,due}`). Create deck → `POST /flashcard/decks?name=&public=`. Rename → `PATCH /flashcard/decks/{deck_id}?name=`. Delete → `DELETE /flashcard/decks/{deck_id}`.
- **Public deck browsing (`PublicDeckBrowserPage.tsx`):** `GET /flashcard/decks/public` → `PublicDeckResponse[]` (includes `card_count`, no stats since not owned yet). Copy → `POST /flashcard/decks/{deck_id}/copy` (clones cards + SRS data into a new private deck).
- **Deck detail (`DeckDetailPage.tsx`):** `GET /flashcard/decks/{deck_id}/cards` → `CardResponse[]` (note: this endpoint returns the *simplified* card shape with `state` as an enum string, `stability`/`difficulty`/`step` — different from the review-session shape below). Delete card → `DELETE /flashcard/decks/{deck_id}/cards/{card_id}`. Reset card SRS → `POST /flashcard/decks/{deck_id}/cards/{card_id}/reset`.
- **Review session (`ReviewSessionPage.tsx`):**
   - Load batch: `GET /flashcard/decks/{deck_id}/review-session?limit=` → `ReviewSessionWithSrsResponse` with `cards[]` as `CardWithSrsResponse` — **raw scheduling primitives** (`srs_queue`, `srs_due`, `srs_ivl`, `srs_reps`, `srs_lapses`, `srs_data` as a JSON string), not the friendly enum/date shape from the deck-cards endpoint. This is the shape the frontend scheduler (`lib/srs/scheduler.ts`) actually operates on.
   - Each card's `data` (JSON string, shape depends on `card_type`) is parsed and rendered by the matching entry in `flashcard/cards/registry.ts` — same registry mechanism as §4. `CardRenderer` picks the renderer by `card_type` and renders it inside `<Suspense>`, with a safe fallback for unsupported types.
   - On grading a card (again/hard/good/easy), the frontend runs the scheduler and **immediately** `POST /flashcard/cards/{card_id}/review` with the resulting SRS state — do not batch/wait for session end, per requirement. The SRS math runs **on the frontend** (see §6.6): `reviewCard(fromApiCard(card), rating, new Date(), fsrsInstance)` computes the next state, which is persisted via `toReviewRequest`. After a successful grade the local queue advances: a card is popped unless its next review is still within a day, in which case it is re-queued (with updated FSRS state in `srs_data`) so learning steps keep progressing until it graduates past the day.
   - **Scheduler: FSRS** (not SM-2). User-level scheduler settings (requestRetention, maximumInterval, learningSteps, relearningSteps, enableFuzz, enableShortTerm) are edited on the Settings page and fed into `makeFsrs(...)` in `ReviewSessionPage`. `lib/srs/scheduler.ts` wraps `ts-fsrs` with the adapter helpers `fromApiCard` / `toReviewRequest` / `toSrsData` / `isDueWithinDay` / `formatDueIn`.
- **Adding cards — vocab only via the API:** only `POST /flashcard/decks/{deck_id}/cards/vocab` exists in the current API, so the deck-detail add form and the `AddToDeckButton` (inside the lookup overlay) create **vocab** cards. The card-type registry (§4) already ships `vocab`, `grammar`, and `sentence` **renderers** (each with a `meta.ts` + default-export `<Type>Card.tsx` resolved lazily) and `CardRenderer` renders any `card_type` it finds (with a safe "unsupported" fallback), so grammar/sentence cards can be added later purely by feeding them through the API — no UI/registry changes needed.

---

## 6. API Client Layer (`lib/api/*`)

- `client.ts`: central `fetch` wrapper — injects `Authorization: Bearer <token>`, on `401` attempts one `POST /token/refresh` + retry, otherwise routes to logout.
- Each domain file (`auth.ts`, `user.ts`, `transcription.ts`, `manga.ts`, `dictionary.ts`, `flashcard.ts`) exports typed functions 1:1 with the OpenAPI paths, using the schemas above (`TranscriptDetailResponse`, `CardWithSrsResponse`, etc. — generate types from the OpenAPI doc with `openapi-typescript` rather than hand-writing them, given the schema is already available).
- React Query key conventions:
  - `['transcription', id]`, `['transcriptionSettings', id]`
  - `['manga', id]`, `['mangaChapter', chapterId]`, `['mangaOcr', chapterId]`
  - `['decks']`, `['deck', deckId, 'cards']`, `['reviewSession', deckId]`
  - `['userSettings']`
- **Confirmed placeholder, not in scope:** the `/web-novel/*` endpoints exist in the backend as placeholder routes for a possible future feature. Do not generate a `lib/api/webnovel.ts` wrapper or any pages for it in this build — exclude it entirely from the frontend until it's actually scoped as a feature, so there's no half-wired dead code to maintain.

---

## 6.5 External Libraries for Non-Rendering Concerns

Registry/UI code (§4) stays hand-written since it's specific to this app's file layout, but anything that's pure logic — scheduling math, schema validation, token handling, debouncing — should prefer a maintained library over a hand-rolled implementation. This keeps `lib/` thin and puts correctness-critical math (especially SRS) on code that's already been tested by other people.

| Concern | Library | Notes |
|---|---|---|
| Settings schema validation | **zod** | Replaces hand-rolled shape checks in `validateOrDefault.ts`. Define a zod schema per settings domain per `schemaVersion`; `safeParse` gives a clean success/failure result to drive the "fall back to defaults" branch, and zod's `.transform()`/`.pipe()` chains work well for expressing migrations as schema-to-schema transforms rather than imperative functions. |
| SRS scheduling | **ts-fsrs** | The frontend scheduler is a FSRS implementation (`lib/srs/scheduler.ts`) that wraps `ts-fsrs`, with thin adapter helpers (`makeFsrs`, `fromApiCard`, `toReviewRequest`, `toSrsData`, `isDueWithinDay`) mapping to/from the API's `srs_*` fields. User-level scheduler settings (requestRetention, maximumInterval, learningSteps, relearningSteps, enableFuzz, enableShortTerm) drive `makeFsrs`. See §6.6. |
| JWT expiry / refresh timing | **jwt-decode** | Decode the access token's `exp` claim client-side to schedule the silent-refresh timer in `AuthProvider`, instead of hand-parsing/base64-decoding the JWT payload. |
| Debouncing (settings autosave input, video-progress POST, OCR-triggered search) | **use-debounce** (hook form) or **lodash.debounce** | Replaces hand-rolled `setTimeout`/`clearTimeout` bookkeeping scattered across hooks. |
| OpenAPI-derived types | **openapi-typescript** | Already planned in §7 Phase 0 — generates `lib/api/types.gen.ts` directly from the spec at the top of this doc, so response/request shapes never drift from hand-maintained interfaces. |
| YouTube playback | **react-youtube** | Thin wrapper over the IFrame API; already the plan in §2 — avoids hand-rolling postMessage/ready-state handling for `VideoPanel`. |
| Server state fetch/cache/mutate | **TanStack Query** | Already the plan in §2/§6 — avoids hand-rolled cache invalidation, retry, and loading-state plumbing across every page. |

**SRS scheduling — the chosen implementation:**
The scheduler is **FSRS**, implemented on the frontend via `ts-fsrs` (actively maintained, TypeScript-native, from the `open-spaced-repetition` org). `lib/srs/scheduler.ts` wraps it with the adapter helpers described in §6.6, so the API's `srs_*` fields are the only contract the backend needs to honor — the backend stays a dumb store and the frontend remains authoritative for scheduling math. The FSRS config comes from user-level settings (editable on the Settings page), not hardcoded constants.

---

## 6.6 SRS Scheduler (`lib/srs/scheduler.ts`)

The scheduler is a **FSRS** implementation that runs **on the frontend**. The review
session loads the raw SRS fields from `CardWithSrsResponse` (`srs_queue`, `srs_due`,
`srs_ivl`, `srs_reps`, `srs_lapses`, `srs_data`), converts them into a `ts-fsrs` card,
computes the next state from the user's `SchedulerSettings`, and persists the result.

`makeFsrs` is configured from the user-level settings edited on the Settings page:

| `SchedulerSettings` field | Meaning |
|---|---|
| `requestRetention` | Target retention (0–1), e.g. 0.9 |
| `maximumInterval` | Cap on the scheduled interval, in days |
| `learningSteps` | Learning-step durations (array, minutes) |
| `relearningSteps` | Relearning-step durations (array, minutes) |
| `enableFuzz` | Random fuzz on intervals |
| `enableShortTerm` | Short-term scheduling mode |

### Adapter surface (`lib/srs/scheduler.ts`)

The scheduler is a **thin adapter over `ts-fsrs`** — all scheduling math lives in the
library; this module only converts between the API shape and the ts-fsrs `Card`.

```ts
// Re-exported from ts-fsrs so call sites don't import the lib directly.
export { Rating }                 // Again = 1, Hard = 2, Good = 3, Easy = 4
export const Queue = State        // ts-fsrs State enum (New/Learning/Review/Relearning)

makeFsrs(opts?: {
  requestRetention?: number;      // -> request_retention
  maximumInterval?: number;       // -> maximum_interval (days)
  learningSteps?: string[];       // -> learning_steps, e.g. ['1m','10m']
  relearningSteps?: string[];     // -> relearning_steps
  enableFuzz?: boolean;           // -> enable_fuzz
  enableShortTerm?: boolean;      // -> enable_short_term
}): FSRS                          // a ts-fsrs FSRS instance

fromApiCard(api: ApiSrsFields, now?: Date): Card
  // ApiSrsFields = { srs_queue?, srs_due?, srs_factor?, srs_left?,
  //                  srs_ivl?, srs_reps?, srs_lapses?, srs_data? }
  // Authoritative state is the serialized ts-fsrs Card in `srs_data`;
  // falls back to reconstructing a best-effort Card from the legacy srs_* scalars.

reviewCard(card: Card, rating: Rating, now?: Date, instance?: FSRS): Card
  // calls instance.next(card, now, grade) — the real FSRS math runs in ts-fsrs.

toReviewRequest(card: Card): { card: Record<string, unknown> }
  // persists the whole ts-fsrs Card (backend stores it as its SrsCard).

toSrsData(card: Card): string     // JSON.stringify for the srs_data blob
isDueWithinDay(card: Card, now?: Date): boolean
formatDueIn(card: Card, now?: Date): string
newCard(now?: Date): Card         // createEmptyCard from ts-fsrs
```

`fromApiCard` prefers the serialized ts-fsrs `Card` in `srs_data` (normalizing `due`
between `Date`/ISO-string and `state` between numeric/`"New"` form), falling back to a
best-effort reconstruction from the denormalized `srs_*` scalars for legacy cards.
`toReviewRequest` persists the **entire** fsrs `Card` (not hand-mapped scalar fields),
so stability/difficulty/retrievability live in `srs_data`. The per-card-type `data`
blob (word/grammar/sentence content) is never touched by the scheduler.

**Usage in `ReviewSessionPage.tsx`:** build `fsrsInstance` from `userSettings.scheduler`
→ `reviewCard(fromApiCard(card), rating, new Date(), fsrsInstance)` →
`toReviewRequest(...)` → `POST /flashcard/cards/{card_id}/review` **immediately** (no
batching). After success the local queue advances: a card is popped unless
`isDueWithinDay(next)` is true, in which case it is re-queued (with `toSrsData(next)`
stored in `srs_data`) so learning steps keep progressing until the next review is more
than a day out. This keeps the frontend authoritative for scheduling while the backend
is a dumb store.

---

## 6.7 Cross-Cutting Concerns

These apply across every page rather than belonging to one feature, so they're centralized here instead of being repeated per page in §5.

### 6.7.1 Error Handling

- **Normalize error shapes in `client.ts`.** FastAPI's `422` responses use `HTTPValidationError` (a `detail[]` array of `{loc, msg, type}`) — the client wrapper parses this into a single internal `ApiError { status, fields?: FieldError[], message }` so every call site handles one shape regardless of status code. Other statuses (401/403/404/500) fall back to `message` only.
- **Three distinct error *presentations*, not one generic error component:**
  - *Inline field errors* — map `ApiError.fields` (from 422) back onto specific form inputs (login/register, deck rename, settings save).
  - *Non-blocking banner/toast* — background actions that shouldn't interrupt the user (video-progress POST failing, a debounced settings autosave failing) surface a small transient notice, not a modal.
  - *Full-page error state* — failed initial loads with nothing to show otherwise (transcription detail, manga chapter, deck list) render `ErrorBanner` in place of content, with a retry action.
- **Route-level error boundaries**, not one global boundary — a crash in `ClozeUI` shouldn't take down the sidebar or navigation. Wrap each page-level route component individually.
- **Retry policy differs by request type.** GETs: safe to auto-retry via React Query's default backoff. Mutations (`POST /flashcard/cards/{id}/review`, `POST /transcription/transcribe/{id}/settings`, etc.): no silent auto-retry — surface the failure and require an explicit user retry, since blindly retrying a mutation risks double-submission if the original request actually succeeded server-side but the response was lost in transit.

### 6.7.2 Connectivity Monitoring (offline / can't-reach-server)

Distinct from the landing page's cold-start ping loop (§5.1, which runs once, pre-login, until the server wakes up). This is a *post-login*, ongoing health check:

- `useConnectivityMonitor` pings `GET /ping` on a fixed interval — **every 2 minutes** — for as long as the user is authenticated and in the app.
- The 2-minute tick is the **only** signal that flips status to `offline`.
- A transient per-request network error does **not** immediately show the banner. Instead it triggers a **debounced (500ms) verification ping** (`subscribeNetworkStatus` → `verify`), and only that ping failing flips status to `offline`. This keeps the reconnect banner from popping up on every transient error. The browser's own `offline`/`online` events also route through a ping rather than flipping status directly.
- **`ConnectivityBanner`** renders a persistent, non-blocking banner (fixed position, top of the app shell) whenever state is `offline`: *"Can't reach the server"* + a **Retry** button. It does not block interaction with already-loaded content — the user can keep reading a transcript or manga page that's already loaded; only new requests will keep failing until connectivity returns.
- **Retry button** triggers an immediate out-of-cycle `/ping` call. On success: dismiss the banner, restart (not just one-shot) the 2-minute timer from now, and let React Query's normal retry/refetch machinery pick back up on the next natural refetch.
- On success, the 2-minute interval continues from that point — a retry doesn't just check once and stop monitoring.

```ts
// hooks/useConnectivityMonitor.ts (shape, not full implementation)
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function useConnectivityMonitor() {
  const [status, setStatus] = useConnectivityStore(); // zustand slice: 'online' | 'offline'

  const check = useCallback(async () => {
    try {
      await api.ping(); // GET /ping
      setStatus('online');
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  return { status, retry: check };
}
```

### 6.7.3 Token Storage & Security

- Access/refresh tokens: `localStorage` is acceptable given this hits your own FastAPI backend as a personal-project SPA (simpler than httpOnly cookies, which would need CORS/CSRF handling on the backend) — but make this a deliberate choice, not a default.
- Backend-sourced text (manga OCR lines, dictionary entries, transcript text) is always rendered as text content, never via `dangerouslySetInnerHTML`.

### 6.7.4 Race Conditions & Stream Cleanup

- Rapid navigation between transcripts/manga chapters is handled correctly by React Query's per-query-key caching (§6) without extra work.
- `GET /manga/ocr/stream/{chapter_id}` (SSE) needs **explicit cleanup on unmount or chapter change** — close the connection, or a stale stream can populate the OCR overlay for a page the user has already navigated away from.
- Guard against overlapping video seeks: if cloze/anki click-to-seek fires while a previous seek is still in flight, ignore or queue rather than racing the player's internal state.

### 6.7.5 i18n

- `react-i18next` scaffolded from Phase 0, not retrofitted later — retrofitting touches every component that renders copy.
- `en` and `vi` locale namespaces from the start, even if only one is fully populated initially, since UI copy needs both.
- Vietnamese/Japanese text inputs (dictionary textarea, settings fields) must not fire on-keystroke logic during IME composition — guard any per-keystroke handling with `compositionstart`/`compositionend`, relevant mainly if any live-as-you-type behavior is ever added elsewhere (the dictionary page itself is explicit-submit per §5.6, so it's unaffected, but this applies to any future live-filter inputs).

### 6.7.6 Empty States

Every list-bearing page needs an explicit empty state via the shared `EmptyState` component — easy to forget until it's the first thing a fresh account actually sees:

| Page | Empty condition | Suggested copy/action |
|---|---|---|
| Transcription history | No videos visited yet | "Paste a YouTube link to get started" |
| Manga search results | No matches for query | "No manga found for '…' " |
| Manga history | No chapters read yet | link to search |
| Deck list | No decks yet | "Create a deck" CTA |
| Public deck browser | No public decks available | plain message, no CTA needed |
| Deck detail (cards) | No cards in deck | "Add words from Dictionary or Transcription lookup" |
| Review session | Nothing due | "All caught up — nothing due right now" (distinct from a loading or error state) |
| OCR text panel | No OCR run yet for this page | "Run OCR to see extracted text" + trigger action |
| Dictionary lookup | Tokenized but zero dictionary matches for a token | "No dictionary entries found" inline, not a blank popover |

### 6.7.7 Testing Infrastructure

- **Unit/integration:** Vitest + React Testing Library (matches Vite, no separate runner config).
- **API mocking:** MSW (Mock Service Worker) — write integration tests against the real `lib/api/*` fetch calls without a live backend; doubles as local dev mocking when the backend is asleep/unreachable.
- **E2E (lower priority, personal-project scope):** Playwright for the highest-value flows only — login → transcribe → review cloze; add word → review flashcard.

---

## 7. Implementation Plan (Phased)

**Phase 0 — Scaffolding**
1. Vite + React + TS project, CSS Modules configured, `styles/tokens.css` (color scales for light/dark + accent), Zustand store shells, React Query provider.
2. Generate API types from the OpenAPI doc (`openapi-typescript` → `lib/api/types.gen.ts`), then hand-write the thin function wrappers in `lib/api/*.ts` on top.
3. `createGlobRegistry` helper + the `meta.ts` convention, proven out with a throwaway 2-type example before building real UIs.
4. `react-i18next` init (`i18n/index.ts`) with `en`/`vi` locale namespaces (§6.7.5) — wired before any page copy is written, so nothing needs retrofitting.
5. `EmptyState`, `ErrorBanner`, `Spinner` shared components + `client.ts`'s `ApiError` normalization (§6.7.1) built before any page fetches data, so every subsequent phase uses them rather than inventing ad hoc loading/error/empty UI per page.

**Phase 1 — Auth & shell**
6. Landing page ping loop → login/register page → `AuthProvider` token lifecycle.
7. App shell: authenticated layout wrapper, route guards.
8. `useConnectivityMonitor` + `ConnectivityBanner` (§6.7.2) wired into the app shell — build this right after auth since every later phase's API calls benefit from it existing.

**Phase 2 — Transcription**
9. Transcription list (preview + create + history + visit-logging).
10. Transcription view shell: Sidebar + VideoPanel (mount/visibility behavior) wired but with a placeholder review UI.
11. Cloze UI (registry entry #1): rendering, regenerate, hover-reveal, click-to-seek.
12. Anki UI (registry entry #2): segment repeat/next/prev, click-word-to-seek.
13. Per-transcription settings: schema (as zod schemas, see §6.5) + migrations + save endpoint wiring + dirty-warning guard (build the dirty-warning mechanism here once, reuse in §Phase 5).
14. Video progress persistence (debounced).

**Phase 3 — Dictionary & shared lookup**
15. `useLookup` hook + `LookupOverlay` component (single/multi-result), used first standalone on the Dictionary page. Confirm tokenization stays explicit-submit (§5.6/§6.7.5), not live-as-you-type.
16. Wire the same overlay into the transcription view (click transcript word → lookup) — validates the "shared across pages" requirement early, before manga adds a third consumer.

**Phase 4 — Manga**
17. Search, detail, reader (page nav, zoom, reading modes — no OCR yet).
18. OCR: fetch existing results, normalized-coordinate overlay positioning, OCR text panel (closable, with empty state per §6.7.6), trigger-OCR streaming flow with explicit unmount/chapter-change cleanup (§6.7.4), reset.
19. Wire `LookupOverlay` into OCR'd text (third consumer).
20. Manga history.

**Phase 5 — Settings page**
21. Global user settings page reusing the schemaVersion/migration/dirty-warning machinery from Phase 2.

**Phase 6 — Flashcards**
22. Deck list + stats, create/rename/delete deck.
23. Public deck browse + copy.
24. Deck detail (card list, delete, reset).
25. Card-type registry (mirrors §4 exactly), starting with `VocabCard` only — the sole type with both a create-endpoint and a current requirement. Structure the registry so `grammar`/`sentence` can be added later without touching registry.ts, but don't build their folders yet.
  26. Drop in the FSRS scheduler from §6.6 as `lib/srs/scheduler.ts` (wraps `ts-fsrs` with the `makeFsrs`/`fromApiCard`/`toReviewRequest`/`toSrsData`/`isDueWithinDay` adapters); wire it against the review-session response and feed it from user-level scheduler settings.
27. Review session: batch load, per-card render via registry, immediate per-review save (not batched); "nothing due" empty state (§6.7.6).
28. "Add to deck" wiring from `LookupOverlay` (closes the loop from dictionary/transcription/manga → flashcards).

**Phase 7 — Polish**
29. Dark/light + accent color toggle applied via CSS custom properties on `:root`.
30. Error/empty/loading states audit across all pages against the §6.7.6 table — confirm every list-bearing page has its empty state, not just the ones built during their own phase.
31. Bundle-size check: confirm cloze/anki UIs and vocab/grammar/sentence cards are actually split into separate chunks (verify in build output, not just assumed from the registry pattern).
32. i18n coverage pass: confirm no hardcoded English/Vietnamese strings slipped into components outside the locale files.

---

## 8. Testing Plan

**Unit**
- `lib/settings/validateOrDefault.ts`: malformed JSON, missing `schemaVersion`, each migration step, partial-domain fallback behavior.
- `lib/srs/scheduler.ts` (§6.6): `fromApiCard`/`toReviewRequest`/`toSrsData` field mapping (confirm nothing gets silently defaulted to 0 when a `srs_*` field is legitimately `null` vs missing on a brand-new card); `makeFsrs` produces a valid next state for every `Rating` (Again/Hard/Good/Easy); the within-day re-queue path carries FSRS state forward in `srs_data` via `toSrsData`.
- `createGlobRegistry` + `meta.ts` resolution: adding a fake third UI type and confirming it appears without registry.ts edits.
- `useLookup`: single-result vs multi-result branching.

- `useConnectivityMonitor`: mock `/ping` to fail then succeed, confirm the 2-minute interval fires, an in-flight network error flips status immediately (not waiting for the next tick), and Retry re-checks on demand and resumes the interval from that point.
- `client.ts` `ApiError` normalization: 422 → field errors, other statuses → message-only, network throw → distinct "offline" signal.

**Integration (component + mocked API)**
- Cloze: regenerate produces a different hidden set (statistically) but same word list; click-to-seek calls the video seek function with the correct timestamp.
- Anki: next/prev boundary behavior (first/last segment), repeat doesn't advance.
- OCR overlay: box positions scale correctly across at least two zoom levels and one non-square page image (regression-guard the normalized-coordinate math specifically).
- Settings dirty-guard: in-app nav blocked while dirty, allowed after save or discard; `beforeunload` fires only when dirty.
- Review session: reviewing one card fires exactly one `POST /flashcard/cards/{id}/review` immediately, without waiting for the rest of the batch.
- `ConnectivityBanner`: appears on simulated offline, Retry button re-checks and dismisses on success, doesn't block interaction with already-rendered content while showing.
- Dictionary page: typing does **not** trigger `GET /tokenization/tokenize` — only explicit submit does (regression guard for §5.6/§6.7.5).
- Each table row in §6.7.6 rendered once with an empty dataset to confirm `EmptyState` actually appears rather than a blank list or an infinite spinner.

**Manual / exploratory**
- Cold start: kill backend, confirm landing page pings, recovers, and doesn't infinite-loop past the timeout cap.
- Video-hidden-but-playing: toggle panel off mid-playback, confirm audio/progress continues and reappears in sync.
- Token refresh: force a 401 mid-session, confirm silent refresh + retry, and confirm eventual logout path when refresh itself fails.

---

## 9. Review Checklist (pre-merge, per phase)

- [ ] No component pulls in another registry entry's component code (verify via bundle analyzer, not assumption).
- [ ] Every settings write includes `schemaVersion`; every settings read runs through `validateOrDefault` using zod `safeParse`, not hand-rolled shape checks.
- [ ] `VideoPanel` never unmounts on sidebar toggle — only visibility/size changes.
- [ ] OCR overlay coordinates are stored/consumed as normalized (0–1), not raw pixels, anywhere they cross a zoom boundary.
- [ ] All three `LookupOverlay` call sites (dictionary, transcription, manga) share the same component/hook — no copy-pasted variant.
- [ ] Review grading writes happen per-card, not batched at session end.
- [ ] CSS Modules only — no stray global class names leaking across pages.
- [ ] `/web-novel/*` has no API client wrapper and no pages — confirmed excluded, not half-wired.
- [ ] `scheduler.ts` implements **FSRS** scheduling via `ts-fsrs`; the frontend computes the next review (`reviewCard` + `makeFsrs`) and persists it through `toReviewRequest` — no FSRS-incompatible fields leak, and the `data`/`srs_data` content blob is never touched by the scheduler.
- [ ] `fromApiCard`/`toReviewRequest` map `srs_queue`/`srs_due`/`srs_ivl`/`srs_reps`/`srs_lapses` directly to/from the FSRS card/`SaveReviewRequest` — and the within-day re-queue path uses `toSrsData` to carry FSRS state forward in `srs_data`.
- [ ] `ConnectivityBanner` shows on offline, doesn't block already-loaded content, and Retry both re-checks immediately and resumes the normal 2-minute interval afterward (not stuck on one-shot).
- [ ] The connectivity monitor does **not** flip to offline on every transient network error — it only does so via the 2-minute tick or a failed debounced verification ping.
- [ ] `flashcard/cards/` ships `vocab`, `grammar`, and `sentence` renderers behind the registry, and `CardRenderer` renders any `card_type` with a safe fallback for unknown types.
