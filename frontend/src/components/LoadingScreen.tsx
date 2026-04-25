import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  isOpen: boolean;
  message?: string;
  progress?: number;
}

export function LoadingScreen({
  isOpen,
  message = 'Processing...',
  progress,
}: LoadingScreenProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="flex justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>

        <p className="text-foreground font-medium mb-2">{message}</p>

        {progress !== undefined && (
          <div className="w-full bg-muted rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
