import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SplashScreen } from "@/components/SplashScreen";
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiError } from "@/lib/api/client";
import { useState, useCallback } from "react";
import LandingPage from "./pages/LandingPage";
import YouTubeVideoViewerPage from "./pages/YouTubeVideoViewerPage";
import TranscribeViewPage from "./pages/TranscribeViewPage";
import VideoPageWithTabs from "./pages/VideoPageWithTabs";
import TokenizationPage from "./pages/TokenizationPage";
import DictionaryPage from "./pages/DictionaryPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import DeckDetailPage from "./pages/DeckDetailPage";
import ReviewPage from "./pages/ReviewPage";
import MangaPageWithTabs from "./pages/MangaPageWithTabs";
import MangaDetailPage from "./pages/MangaDetailPage";
import MangaReaderPage from "./pages/MangaReaderPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ShareTargetPage from "./pages/ShareTargetPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // GETs are safe to retry, but never retry a client error (§6.7.1).
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Mutations are never silently retried — a lost response could mean the
      // write actually succeeded, so retrying risks double-submission.
      retry: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/youtube" replace /> : <LoginPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/" element={user ? <Navigate to="/youtube" replace /> : <LandingPage />} />

      <Route path="/youtube" element={<ProtectedRoute><AppLayout><VideoPageWithTabs /></AppLayout></ProtectedRoute>} />
      <Route path="/youtube/video/:videoId" element={<ProtectedRoute><YouTubeVideoViewerPage /></ProtectedRoute>} />

      <Route path="/transcript/:id" element={<ProtectedRoute><TranscribeViewPage /></ProtectedRoute>} />

      <Route path="/tokenize" element={<ProtectedRoute><AppLayout><TokenizationPage /></AppLayout></ProtectedRoute>} />
      <Route path="/dictionary" element={<ProtectedRoute><AppLayout><DictionaryPage /></AppLayout></ProtectedRoute>} />

      <Route path="/vocabulary" element={<ProtectedRoute><AppLayout><FlashcardsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/vocabulary/decks/:deckId" element={<ProtectedRoute><AppLayout><DeckDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/vocabulary/review/:deckId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />

      <Route path="/manga" element={<ProtectedRoute><AppLayout><MangaPageWithTabs /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/:mangaId" element={<ProtectedRoute><AppLayout><MangaDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/:mangaId/read/:chapterId" element={<ProtectedRoute><MangaReaderPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/share-target" element={<ProtectedRoute><ShareTargetPage /></ProtectedRoute>} />
      <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
    </Routes>
  );
}

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          {!splashDone ? (
            <SplashScreen onComplete={handleSplashComplete} />
          ) : (
            <BrowserRouter>
              <ConnectivityBanner />
              <AppRoutes />
            </BrowserRouter>
          )}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
