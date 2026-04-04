## Changes

### 1. Language: Japanese → Vietnamese (throughout)
- Update all mock data, labels, and practice modes from EN to VN

### 2. Transcription List + Detail Pages
- **TranscribePage**: Show list of transcriptions with thumbnail, source (YouTube/upload), status (pending/completed)
- **TranscriptDetailPage**: New page (`/transcript/:id`) showing full transcript + actions
- Update types: add `thumbnailUrl`, `sourceSite`, `status` fields

### 3. Simplified Add Card
- User inputs word + meaning only; backend handles POS, reading, etc.
- Remove POS selector from form

### 4. On-Demand Credit Pricing
- Replace subscription plans with credit packs (10, 50, 100, 500 credits)
- Update PricingPage and payment types

### 5. Login Page + Auth Guard
- Simple login page with Google sign-in button (mock)
- Unregistered users can only access `/public` and `/login`
- Auth context to track login state

### 6. Splash Screen
- Show on app load with init stage messages (connecting to backend, loading data, etc.)

### 7. Sentence Practice: 2 Modes
- JP→VN mode and VN→JP mode with mode selector

### 8. Grammar Flashcards
- New `/grammar` page with grammar-specific SRS cards
- Separate from vocab flashcards

### 9. Rename Pages
- Flashcards → "Vocabulary" in nav
- New "Grammar" nav item for grammar flashcards

### Files to create:
- `src/pages/TranscriptDetailPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/GrammarPage.tsx`
- `src/components/SplashScreen.tsx`
- `src/components/grammar/GrammarCard.tsx`
- `src/components/transcription/TranscriptionListItem.tsx`
- `src/lib/api/grammar.ts`
- `src/lib/auth-context.tsx`

### Files to edit:
- `src/App.tsx` - routes, auth guard, splash
- `src/components/layout/AppLayout.tsx` - nav items rename
- `src/pages/TranscribePage.tsx` - list view
- `src/pages/PracticePage.tsx` - 2 modes
- `src/pages/PricingPage.tsx` - credit packs
- `src/components/flashcards/AddCardForm.tsx` - simplify
- `src/lib/api/types.ts` - new types
- `src/lib/api/mock-data.ts` - JP→VN data
- `src/lib/api/payment.ts` - credit packs
- `src/lib/api/sentence-practice.ts` - 2 modes, VN
- `src/lib/api/transcription.ts` - list with status/thumbnail
