import { WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConnectivityMonitor } from '@/hooks/useConnectivityMonitor';

/**
 * Non-blocking "can't reach the server" banner (§6.7.2).
 *
 * Deliberately does not overlay or disable the app: already-loaded content
 * stays usable, only new requests keep failing until connectivity returns.
 */
export function ConnectivityBanner() {
  const { status, checking, retry } = useConnectivityMonitor();

  if (status === 'online') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-destructive px-4 py-2 text-destructive-foreground shadow-md"
      data-testid="connectivity-banner"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">Không thể kết nối máy chủ</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1.5"
        onClick={() => void retry()}
        disabled={checking}
        data-testid="connectivity-retry-btn"
      >
        {checking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Thử lại
      </Button>
    </div>
  );
}
