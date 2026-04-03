import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import TranscribePage from "./pages/TranscribePage";
import FlashcardsPage from "./pages/FlashcardsPage";
import PublicTranscriptsPage from "./pages/PublicTranscriptsPage";
import HistoryPage from "./pages/HistoryPage";
import PracticePage from "./pages/PracticePage";
import TokenizerPage from "./pages/TokenizerPage";
import PricingPage from "./pages/PricingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<TranscribePage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/public" element={<PublicTranscriptsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/tokenizer" element={<TokenizerPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
