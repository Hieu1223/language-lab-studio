import { create } from "zustand";

interface VideoPanelState {
  visible: boolean;
  source: string | null;
  /** Increment to request a seek from any consumer. */
  seekNonce: number;
  /** Target seek time in seconds. */
  seekTarget: number | null;
  playing: boolean;
  setVisible: (visible: boolean) => void;
  setSource: (source: string | null) => void;
  seekTo: (seconds: number) => void;
  setPlaying: (playing: boolean) => void;
}

/**
 * Cross-cutting video-panel state (doc §3 `stores/videoPanelStore.ts`).
 * The panel stays mounted (visibility toggled via CSS, never unmounted) so
 * audio/progress continue when the user collapses it (see §5.4 / §6.7.4).
 */
export const useVideoPanelStore = create<VideoPanelState>((set) => ({
  visible: true,
  source: null,
  seekNonce: 0,
  seekTarget: null,
  playing: false,
  setVisible: (visible) => set({ visible }),
  setSource: (source) => set({ source }),
  seekTo: (seconds) =>
    set((s) => ({ seekTarget: seconds, seekNonce: s.seekNonce + 1 })),
  setPlaying: (playing) => set({ playing }),
}));
