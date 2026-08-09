import { create } from "zustand";

export type ToastKind = "info" | "success" | "error" | "warning";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

/**
 * Cross-cutting toast queue (doc §3 `stores/toastStore.ts`). Surfaced by the
 * app shell's <Toaster />. Background, non-blocking notices (video-progress
 * POST failures, debounced autosave failures) flow through here per §6.7.1.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (m: string) => useToastStore.getState().push("info", m),
  success: (m: string) => useToastStore.getState().push("success", m),
  error: (m: string) => useToastStore.getState().push("error", m),
  warning: (m: string) => useToastStore.getState().push("warning", m),
};
