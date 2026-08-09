import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoadingScreenProps {
  isOpen: boolean;
  message?: string;
  progress?: number;
}

export function LoadingScreen({
  isOpen,
  message,
  progress,
}: LoadingScreenProps) {
  const { t } = useTranslation('common');

  if (!isOpen) return null;

  // Resolved at render time (not as a default parameter) so the fallback copy
  // follows the active locale.
  const text = message ?? t('states.processing');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="flex justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>

        <p className="text-foreground font-medium mb-2">{text}</p>

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
