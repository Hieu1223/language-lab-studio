import { useCallback, useEffect, useRef } from 'react';
import { ping, subscribeNetworkStatus } from '@/lib/api/client';
import { useConnectivityStore } from '@/stores/connectivityStore';

/** The 2-minute tick is the primary signal that flips status (§6.7.2). */
const CHECK_INTERVAL_MS = 2 * 60 * 1000;
/** A transient request failure only triggers a debounced verification ping. */
const VERIFY_DEBOUNCE_MS = 500;

/**
 * Post-login connectivity monitor. Distinct from the splash screen's
 * cold-start loop, which runs once before the app shell mounts.
 *
 * Status flips to 'offline' only via the interval tick or a failed debounced
 * verification ping — never directly from a single transient request error,
 * which would make the banner flap.
 */
export function useConnectivityMonitor() {
  const status = useConnectivityStore((s) => s.status);
  const checking = useConnectivityStore((s) => s.checking);
  const setStatus = useConnectivityStore((s) => s.setStatus);
  const setChecking = useConnectivityStore((s) => s.setChecking);

  const intervalRef = useRef<number | null>(null);
  const verifyTimer = useRef<number | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      await ping();
      setStatus('online');
      return true;
    } catch {
      setStatus('offline');
      return false;
    } finally {
      setChecking(false);
    }
  }, [setChecking, setStatus]);

  /** (Re)start the interval so a manual retry resumes monitoring from now. */
  const startInterval = useCallback(() => {
    if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      void check();
    }, CHECK_INTERVAL_MS);
  }, [check]);

  const retry = useCallback(async () => {
    const ok = await check();
    startInterval();
    return ok;
  }, [check, startInterval]);

  useEffect(() => {
    startInterval();
    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current);
    };
  }, [startInterval]);

  // Transient network errors -> debounced verification ping, not an instant flip.
  useEffect(() => {
    const scheduleVerify = () => {
      if (verifyTimer.current != null) window.clearTimeout(verifyTimer.current);
      verifyTimer.current = window.setTimeout(() => {
        void check();
      }, VERIFY_DEBOUNCE_MS);
    };

    const unsubscribe = subscribeNetworkStatus((ok) => {
      if (ok) {
        if (verifyTimer.current != null) window.clearTimeout(verifyTimer.current);
        setStatus('online');
      } else {
        scheduleVerify();
      }
    });

    // Browser online/offline events also route through a ping.
    window.addEventListener('online', scheduleVerify);
    window.addEventListener('offline', scheduleVerify);

    return () => {
      unsubscribe();
      window.removeEventListener('online', scheduleVerify);
      window.removeEventListener('offline', scheduleVerify);
      if (verifyTimer.current != null) window.clearTimeout(verifyTimer.current);
    };
  }, [check, setStatus]);

  return { status, checking, retry };
}
