import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const stages = [
  'Đang kết nối máy chủ...',
  'Đang tải dữ liệu ngôn ngữ...',
  'Đang khởi tạo SRS engine...',
  'Sẵn sàng!',
];

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (stageIdx < stages.length - 1) {
      const t = setTimeout(() => setStageIdx(stageIdx + 1), 800 + Math.random() * 400);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
  }, [stageIdx, onComplete]);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      <h1 className="font-display font-bold text-4xl text-primary mb-2">NihonGo</h1>
      <p className="text-xs text-muted-foreground font-mono mb-8">日本語 · Học tiếng Nhật</p>
      <Loader2 className="w-6 h-6 text-primary animate-spin mb-4" />
      <div className="space-y-1 text-center">
        {stages.slice(0, stageIdx + 1).map((msg, i) => (
          <p
            key={i}
            className={`text-sm font-mono transition-opacity duration-300 ${
              i === stageIdx ? 'text-foreground' : 'text-muted-foreground/50'
            }`}
          >
            {i < stageIdx ? '✓' : '→'} {msg}
          </p>
        ))}
      </div>
    </div>
  );
}
