import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SplashScreen } from "@/components/SplashScreen";
import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useCallback } from "react";
import TranscribePage from "./pages/TranscribePage";
import TranscriptDetailPage from "./pages/TranscriptDetailPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import GrammarPage from "./pages/GrammarPage";
import PublicTranscriptsPage from "./pages/PublicTranscriptsPage";
import HistoryPage from "./pages/HistoryPage";
import PracticePage from "./pages/PracticePage";
import TokenizerPage from "./pages/TokenizerPage";
import PricingPage from "./pages/PricingPage";
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
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/public" element={<AppLayout><PublicTranscriptsPage /></AppLayout>} />
      <Route path="/" element={<ProtectedRoute><AppLayout><TranscribePage /></AppLayout></ProtectedRoute>} />
      <Route path="/transcript/:id" element={<ProtectedRoute><AppLayout><TranscriptDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/vocabulary" element={<ProtectedRoute><AppLayout><FlashcardsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/grammar" element={<ProtectedRoute><AppLayout><GrammarPage /></AppLayout></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><AppLayout><HistoryPage /></AppLayout></ProtectedRoute>} />
      <Route path="/practice" element={<ProtectedRoute><AppLayout><PracticePage /></AppLayout></ProtectedRoute>} />
      <Route path="/tokenizer" element={<ProtectedRoute><AppLayout><TokenizerPage /></AppLayout></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute><AppLayout><PricingPage /></AppLayout></ProtectedRoute>} />
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
              <AppRoutes />
            </BrowserRouter>
          )}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
