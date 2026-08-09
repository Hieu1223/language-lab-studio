import { create } from 'zustand';

export type ConnectivityStatus = 'online' | 'offline';

interface ConnectivityState {
  status: ConnectivityStatus;
  checking: boolean;
  lastCheckedAt: number | null;
  setStatus: (status: ConnectivityStatus) => void;
  setChecking: (checking: boolean) => void;
}

/** Cross-cutting connectivity state consumed by ConnectivityBanner (§6.7.2). */
export const useConnectivityStore = create<ConnectivityState>((set) => ({
  status: 'online',
  checking: false,
  lastCheckedAt: null,
  setStatus: (status) => set({ status, lastCheckedAt: Date.now() }),
  setChecking: (checking) => set({ checking }),
}));
