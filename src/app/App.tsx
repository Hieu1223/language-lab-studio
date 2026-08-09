import { useState, useCallback } from "react";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { SplashScreen } from "@/components/SplashScreen";
import { ConnectivityBanner } from "@/common/ConnectivityBanner/ConnectivityBanner";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { AppRouter } from "@/app/router";
import { useConnectivityMonitor } from "@/hooks/useConnectivityMonitor";
import "@/i18n";
import "@/styles/tokens.css";
import "@/styles/reset.css";

/** Drives the post-login /ping health check (doc §6.7.2). */
function ConnectivityMonitor() {
  useConnectivityMonitor();
  return null;
}

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  return (
    <QueryProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            {!splashDone ? (
              <SplashScreen onComplete={handleSplashComplete} />
            ) : (
              <BrowserRouter>
                <ConnectivityMonitor />
                <ConnectivityBanner />
                <AppRouter />
              </BrowserRouter>
            )}
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
};

export default App;
