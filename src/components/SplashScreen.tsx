import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ping } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

interface SplashScreenProps {
  onComplete: () => void;
}

const stages = [
  'Đang kết nối máy chủ...',
  'Tải dữ liệu ngôn ngữ...',
  'Khởi tạo SRS engine...',
  'Sẵn sàng!',
];

/** Cap the cold-start wait so a dead backend can't trap the user (§5.1). */
const MAX_WAIT_MS = 90_000;
const RETRY_DELAY_MS = 2_000;

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stageIdx, setStageIdx] = useState(0);
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
    // Hold on the first stage until the server actually answers.
    if (!serverReady && stageIdx === 0) return;

    if (stageIdx < stages.length - 1) {
      const timer = setTimeout(() => setStageIdx(stageIdx + 1), 600);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(onComplete, 500);
    return () => clearTimeout(timer);
  }, [stageIdx, onComplete, serverReady]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary overflow-hidden mx-auto mb-6 shadow-lg">
          <img src="/icon-512.png" alt="Arisu" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-display font-extrabold text-3xl text-foreground mb-2">ArisuGo</h1>
        <p className="text-muted-foreground text-sm mb-8">日本語 · Học tiếng Nhật</p>

        {timedOut ? (
          <div className="space-y-3" data-testid="splash-timeout">
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Không thể kết nối máy chủ. Máy chủ có thể đang ngủ hoặc ngoại tuyến.
            </p>
            <Button onClick={retry} size="sm" data-testid="splash-retry-btn">
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <motion.p
                key={stageIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-muted-foreground font-medium"
              >
                {stages[stageIdx]}
              </motion.p>
            </div>

            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mx-auto">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width: serverReady ? `${((stageIdx + 1) / stages.length) * 100}%` : '15%',
                }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {!serverReady && attempts > 2 && (
              <p className="text-[10px] text-muted-foreground mt-4">
                Máy chủ đang khởi động… (lần thử {attempts})
              </p>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
