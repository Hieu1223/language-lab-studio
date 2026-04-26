import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SplashScreen } from "@/components/SplashScreen";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useCallback, useEffect } from "react";
import { startBackgroundPing } from "@/lib/api-client";
import LandingPage from "./pages/LandingPage";
import YouTubeBrowsePage from "./pages/YouTubeBrowsePage";
import YouTubeVideoViewerPage from "./pages/YouTubeVideoViewerPage";
import TranscribeViewPage from "./pages/TranscribeViewPage";
import TranscriptionHistoryPage from "./pages/TranscriptionHistoryPage";
import TokenizationPage from "./pages/TokenizationPage";
import DictionaryPage from "./pages/DictionaryPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import DeckDetailPage from "./pages/DeckDetailPage";
import ReviewPage from "./pages/ReviewPage";
import MangaPage from "./pages/MangaPage";
import MangaDetailPage from "./pages/MangaDetailPage";
import MangaReaderPage from "./pages/MangaReaderPage";
import MangaHistoryPage from "./pages/MangaHistoryPage";
import PricingPage from "./pages/PricingPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

      <Route path="/youtube" element={<ProtectedRoute><AppLayout><YouTubeBrowsePage /></AppLayout></ProtectedRoute>} />
      <Route path="/youtube/video/:videoId" element={<ProtectedRoute><YouTubeVideoViewerPage /></ProtectedRoute>} />

      <Route path="/transcripts/history" element={<ProtectedRoute><AppLayout><TranscriptionHistoryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/transcript/:id" element={<ProtectedRoute><TranscribeViewPage /></ProtectedRoute>} />

      <Route path="/tokenize" element={<ProtectedRoute><AppLayout><TokenizationPage /></AppLayout></ProtectedRoute>} />
      <Route path="/dictionary" element={<ProtectedRoute><AppLayout><DictionaryPage /></AppLayout></ProtectedRoute>} />

      <Route path="/vocabulary" element={<ProtectedRoute><AppLayout><FlashcardsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/vocabulary/decks/:deckId" element={<ProtectedRoute><AppLayout><DeckDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/vocabulary/review/:deckId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />

      <Route path="/manga" element={<ProtectedRoute><AppLayout><MangaPage /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/history" element={<ProtectedRoute><AppLayout><MangaHistoryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/:mangaId" element={<ProtectedRoute><AppLayout><MangaDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/manga/:mangaId/read/:chapterUrl" element={<ProtectedRoute><MangaReaderPage /></ProtectedRoute>} />

      <Route path="/pricing" element={<ProtectedRoute><AppLayout><PricingPage /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<AppLayout><NotFound /></AppLayout>} />
    </Routes>
  );
}

function BackgroundPing() {
  useEffect(() => {
    // Ping every 3 minutes (within the 2-5 minute spec)
    const stop = startBackgroundPing(3 * 60 * 1000);
    return stop;
  }, []);
  return null;
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
              <BackgroundPing />
              <AppRoutes />
            </BrowserRouter>
          )}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
