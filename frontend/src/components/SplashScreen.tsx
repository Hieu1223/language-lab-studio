import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

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

  // Ping server on mount and wait until it responds
  useEffect(() => {
    const pingServer = async () => {
      while (true) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout per attempt

          const response = await fetch('https://japlearningbackend.onrender.com/ping', {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            setServerReady(true);
            break;
          }
        } catch {
          // Server not ready, retry after 2 seconds
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    };

    pingServer();
  }, []);

  useEffect(() => {
    // Don't proceed to next stage until server is ready
    if (!serverReady) return;

    if (stageIdx < stages.length - 1) {
      const timer = setTimeout(() => setStageIdx(stageIdx + 1), 800);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(onComplete, 600);
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
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-primary-foreground font-bold text-3xl">日</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl text-foreground mb-2">NihonGo</h1>
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
            animate={{ width: `${((stageIdx + 1) / stages.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>
    </div>
  );
}
