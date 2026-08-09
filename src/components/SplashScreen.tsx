import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ping } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

interface SplashScreenProps {
  onComplete: () => void;
}

const MAX_WAIT_MS = 90_000;
const RETRY_DELAY_MS = 2_000;

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { t } = useTranslation('common');
  const [serverReady, setServerReady] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [nonce, setNonce] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const deadline = Date.now() + MAX_WAIT_MS;

    const loop = async () => {
      while (!cancelled.current) {
        setAttempts((a) => a + 1);
        try {
          await ping();
          if (!cancelled.current) setServerReady(true);
          return;
        } catch {
          /* server is still cold — retry below */
        }

        if (Date.now() >= deadline) {
          if (!cancelled.current) setTimedOut(true);
          return;
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    };

    void loop();
    return () => {
      cancelled.current = true;
    };
  }, [nonce]);

  const retry = useCallback(() => {
    setTimedOut(false);
    setAttempts(0);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!serverReady) return;
    const timer = setTimeout(onComplete, 500);
    return () => clearTimeout(timer);
  }, [serverReady, onComplete]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary overflow-hidden mx-auto mb-6 shadow-lg">
          <img src="/icon-512.png" alt={t('app.logoAlt')} className="w-full h-full object-cover" />
        </div>
        <h1 className="font-display font-extrabold text-3xl text-foreground mb-2">{t('app.name')}</h1>
        <p className="text-muted-foreground text-sm mb-8">{t('app.tagline')}</p>

        {timedOut ? (
          <div className="space-y-3" data-testid="splash-timeout">
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {t('splash.timeout')}
            </p>
            <Button onClick={retry} size="sm" data-testid="splash-retry-btn">
              {t('actions.retry')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground font-medium">
              {t('splash.connecting')}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
