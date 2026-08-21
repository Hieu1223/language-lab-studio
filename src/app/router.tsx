import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import LandingPage from "@/pages/landing/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import ShareTargetPage from "@/pages/auth/ShareTargetPage";
import VideoPageWithTabs from "@/pages/transcription/VideoPageWithTabs";
import YouTubeVideoViewerPage from "@/pages/transcription/YouTubeVideoViewerPage";
import TranscribeViewPage from "@/pages/transcription/TranscribeViewPage";
import YouTubeBrowsePage from "@/pages/transcription/YouTubeBrowsePage";
import YouTubeVideoPage from "@/pages/transcription/YouTubeVideoPage";
import DictionaryPage from "@/pages/dictionary/DictionaryPage";
import FlashcardsPage from "@/pages/flashcard/FlashcardsPage";
import DeckDetailPage from "@/pages/flashcard/DeckDetailPage";
import ReviewPage from "@/pages/flashcard/ReviewPage";
import MangaPageWithTabs from "@/pages/manga/MangaPageWithTabs";
import MangaDetailPage from "@/pages/manga/MangaDetailPage";
import MangaReaderPage from "@/pages/manga/MangaReaderPage";
import MangaBrowse from "@/pages/manga/MangaBrowse";
import MangaHistoryPage from "@/pages/manga/MangaHistoryPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import MonitorPage from "@/pages/monitor/MonitorPage";
import NotFound from "@/pages/NotFound";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

/**
 * Route table (doc §3 `app/router.tsx`). Page components live under
 * `pages/<feature>/`; shared chrome (`AppLayout`) wraps authenticated routes.
 */
export function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/youtube" replace /> : <LoginPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/" element={user ? <Navigate to="/youtube" replace /> : <LandingPage />} />

      <Route path="/youtube" element={<ProtectedRoute><AppLayout><VideoPageWithTabs /></AppLayout></ProtectedRoute>} />
      <Route path="/youtube/browse" element={<ProtectedRoute><AppLayout><YouTubeBrowsePage /></AppLayout></ProtectedRoute>} />
      <Route path="/youtube/video/:videoId" element={<ProtectedRoute><YouTubeVideoViewerPage /></ProtectedRoute>} />
      <Route path="/transcribe/:id" element={<ProtectedRoute><YouTubeVideoPage /></ProtectedRoute>} />
      <Route path="/transcript/:id" element={<ProtectedRoute><TranscribeViewPage /></ProtectedRoute>} />

      <Route path="/monitor" element={<ProtectedRoute><AppLayout><MonitorPage /></AppLayout></ProtectedRoute>} />
      <Route path="/dictionary" element={<ProtectedRoute><AppLayout><DictionaryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/flashcard" element={<ProtectedRoute><AppLayout><FlashcardsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/flashcard/decks/:deckId" element={<ProtectedRoute><AppLayout><DeckDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/flashcard/review/:deckId" element={<ProtectedRoute><AppLayout><ReviewPage /></AppLayout></ProtectedRoute>} />
      <Route path="/flashcard/browse" element={<ProtectedRoute><AppLayout><FlashcardsPage /></AppLayout></ProtectedRoute>} />

      <Route path="/manga" element={<ProtectedRoute><AppLayout><MangaPageWithTabs /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/browse" element={<ProtectedRoute><AppLayout><MangaBrowse /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/history" element={<ProtectedRoute><AppLayout><MangaHistoryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/:mangaId" element={<ProtectedRoute><AppLayout><MangaDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/:mangaId/read/:chapterId" element={<ProtectedRoute><AppLayout><MangaReaderPage /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/share-target" element={<ProtectedRoute><ShareTargetPage /></ProtectedRoute>} />
      <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
    </Routes>
  );
}
