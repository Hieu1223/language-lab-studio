
## Goal

Add a **"Chế độ truy cập" (Accessibility Mode)** in the YouTube transcript viewer (`/youtube/.../viewer`) targeted at blind / low-vision users on phone. The mode is toggled from the Settings drawer and persists in `localStorage`. It collapses the experience to: audio-only playback + segment-loop transcript + a fixed control bar whose buttons never shift.

## Behavior

When **A11y Mode** is ON:

- The video pane is visually hidden (`sr-only` wrapper) but the `VideoPlayer` stays mounted so audio keeps playing and `seekRef` still works.
- The viewer is forced into **`segment-loop`** transcription mode (the existing loop-N-segments logic) — this is "the main part".
- Layout is a fixed 3-row grid on mobile:
  1. **Top header bar (fixed height 56px)** — back button + segment counter "Câu X / Y" (live region for screen readers).
  2. **Middle scroll area** — the looped segment text only (large font, high contrast, `aria-live="polite"`).
  3. **Bottom control bar (fixed height, `position: sticky bottom-0`, safe-area padding)** — 6 large icon buttons in a fixed 6-column grid so each button's screen position never changes regardless of segment text length:

     ```text
     ┌──────┬──────┬──────┬──────┬──────┬──────┐
     │  ⏮  │ −5s  │ ▶/⏸ │ +5s  │  ⏭  │ 🔁  │
     │ Prev │ Back │Play/ │ Fwd  │ Next │Replay│
     │ seg  │  5s  │Pause │ 5s   │ seg  │ loop │
     └──────┴──────┴──────┴──────┴──────┴──────┘
     ```

     Each button:
     - min 56×56 tap target (`min-h-14 min-w-14`)
     - `aria-label` in Vietnamese ("Phát", "Tạm dừng", "Lùi 5 giây", "Tiến 5 giây", "Câu trước", "Câu sau", "Lặp lại đoạn")
     - Identical fixed grid cell so the play/pause swap and label changes do not reflow neighbors.

- Auto-scroll, cloze, highlight modes and layout selector are bypassed (irrelevant without sight).
- Segment changes fire a `aria-live` announcement: "Câu 4 trên 23".

When A11y Mode is OFF: viewer renders exactly as today, no behavioral change.

## Settings & persistence

Add to `TranscriptionSettings`:

```ts
a11yMode: boolean; // default false
```

Persisted via the existing `setTranscriptionSettings` flow. Toggle exposed:
- In the viewer's Settings drawer tab (top of the list, with an `Accessibility` icon).
- In `SettingsPage.tsx` under "Mặc định phiên dịch".

## Files to change

1. **`src/lib/settings-storage.ts`** — add `a11yMode: boolean` to `TranscriptionSettings` + `DEFAULT_TRANSCRIPTION`.
2. **`src/pages/YouTubeVideoViewerPage.tsx`**:
   - Read `settings.a11yMode`. When true, render a separate `<A11ySegmentViewer />` branch instead of the normal `mainContent`, and visually hide the video node with `sr-only` while still mounting it.
   - Force `transcriptionMode = 'segment-loop'` in the active view while a11yMode is on.
   - Suppress the panel/header buttons that aren't needed (loop, panel toggle) — replace with a single "Cài đặt" button that opens the drawer; back button stays where it always was.
3. **New `src/components/transcription/A11ySegmentViewer.tsx`** — the fixed-layout viewer + bottom control bar. Takes props: `rawSegments`, `clozeSegments` (for display), `currentTime`, `segmentLoopStartIdx`, `setSegmentLoopStartIdx`, `seek`, `isPlaying`, `togglePlay`, `skipBy`.
4. **`src/components/video/VideoPlayer.tsx`** — expose `isPlaying` + `play()/pause()` via an optional `controlsRef` (mirrors existing `seekRef`) so the A11y bar can drive playback without showing the video chrome.
5. **`src/pages/SettingsPage.tsx`** — add the toggle row.

## Accessibility specifics

- `<html lang="vi">` already set; add `lang="ja"` on the Japanese transcript text so screen readers switch voice.
- All interactive controls are `<Button>` (focusable, keyboard-operable).
- Single `<main>` retained.
- `aria-live="polite"` region announces segment changes; `aria-live="assertive"` for play/pause toggle is **not** added (too noisy).
- Tokens inside the transcript remain clickable for sighted helpers, but the bottom bar provides the full eyes-free control surface.

## Out of scope

- Desktop styling for a11y mode (mobile-only design; on desktop the toggle still works but layout is the same compact column).
- TTS read-aloud of transcript (separate feature).
- Changing the existing non-a11y viewer behavior.
