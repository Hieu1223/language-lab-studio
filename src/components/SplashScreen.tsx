import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api-client';

interface SplashScreenProps {
  onComplete: () => void;
}

const stages = [
  'Đang kết nối máy chủ...',
  'Tải dữ liệu ngôn ngữ...',
  'Khởi tạo SRS engine...',
  'Sẵn sàng!',
];

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stageIdx, setStageIdx] = useState(0);
  const [serverReady, setServerReady] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Ping /ping repeatedly until the server responds 2xx.
  // Never unblocks unless the server is actually up.
  useEffect(() => {
    let cancelled = false;

    const ping = async (): Promise<void> => {
      while (!cancelled) {
        setAttempts((a) => a + 1);
        try {
          const ctl = new AbortController();
          const to = setTimeout(() => ctl.abort(), 5000);
          const res = await fetch(`${API_BASE_URL}/ping`, {
            method: 'GET',
            signal: ctl.signal,
            cache: 'no-store',
          });
          clearTimeout(to);
          if (res.ok) {
            if (!cancelled) setServerReady(true);
            return;
          }
        } catch {
          /* retry */
        }
        // Wait 2s before retrying
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    ping();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Block on first stage until server is up
    if (!serverReady && stageIdx === 0) return;

    if (stageIdx < stages.length - 1) {
      const timer = setTimeout(() => setStageIdx(stageIdx + 1), 600);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
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
              width: serverReady
                ? `${((stageIdx + 1) / stages.length) * 100}%`
                : '15%',
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {!serverReady && attempts > 2 && (
          <p className="text-[10px] text-muted-foreground mt-4">
            Máy chủ đang khởi động… (lần thử {attempts})
          </p>
        )}
      </motion.div>
    </div>
  );
}
