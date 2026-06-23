import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw, RotateCw, Settings, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface VideoPlayerProps {
  url: string;
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  /** Receives a seek function; useful for clicking transcript tokens. */
  seekRef?: React.MutableRefObject<((seconds: number) => void) | null>;
  /** Receives imperative playback controls (play/pause/toggle/skip + isPlaying getter). */
  controlsRef?: React.MutableRefObject<{
    play: () => void;
    pause: () => void;
    toggle: () => void;
    skipBy: (seconds: number) => void;
    isPlaying: () => boolean;
  } | null>;
  /** Notified when playback state changes (true=playing). */
  onPlayingChange?: (playing: boolean) => void;
}

export function VideoPlayer({
  url,
  onTimeUpdate,
  onPlay,
  onPause,
  seekRef,
  controlsRef,
  onPlayingChange,
}: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);


  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeID(url);

  useEffect(() => {
    if (!videoId) return;

    const loadAPI = () => {
      return new Promise<void>((resolve) => {
        if (window.YT && window.YT.Player) {
          resolve();
          return;
        }

        const existingScript = document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        );

        if (!existingScript) {
          const tag = document.createElement('script');
          tag.src = "https://www.youtube.com/iframe_api"; // ✅ FIXED
          const firstScriptTag = document.getElementsByTagName('script')[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prev?.();
          resolve();
        };
      });
    };

    const createPlayer = () => {
      const el = document.getElementById(`yt-player-${videoId}`);
      if (!el) return;

      playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          disablekb: 1,
        },
        events: {
          onReady: (event: any) => {
            setDuration(event.target.getDuration());
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              onPlay?.();
              startTimer();
            } else {
              setIsPlaying(false);
              onPause?.();
              stopTimer();
            }
          },
        },
      });
    };

    loadAPI().then(createPlayer);

    return () => {
      stopTimer();
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
        onTimeUpdate?.(time);
      }
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  const handleSeek = (val: number[]) => {
    const time = val[0];
    setCurrentTime(time);
    playerRef.current?.seekTo(time, true);
  };

  // Expose imperative seek() to parent
  useEffect(() => {
    if (!seekRef) return;
    seekRef.current = (seconds: number) => {
      if (!playerRef.current?.seekTo) return;
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
      // Auto-play after seek so user immediately hears the spot
      try {
        playerRef.current.playVideo?.();
      } catch {
        /* ignore */
      }
    };
    return () => {
      if (seekRef) seekRef.current = null;
    };
  }, [seekRef]);

  // Expose imperative playback controls to parent (used by a11y bar)
  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = {
      play: () => { try { playerRef.current?.playVideo?.(); } catch { /* ignore */ } },
      pause: () => { try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ } },
      toggle: () => {
        try {
          const state = playerRef.current?.getPlayerState?.();
          if (state === window.YT?.PlayerState?.PLAYING) {
            playerRef.current?.pauseVideo?.();
          } else {
            playerRef.current?.playVideo?.();
          }
        } catch { /* ignore */ }
      },
      skipBy: (seconds: number) => {
        if (!playerRef.current?.seekTo) return;
        const t = (playerRef.current.getCurrentTime?.() ?? 0) + seconds;
        const next = Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, t));
        playerRef.current.seekTo(next, true);
        setCurrentTime(next);
      },
      isPlaying: () => isPlaying,
    };
    return () => {
      if (controlsRef) controlsRef.current = null;
    };
  }, [controlsRef, duration, isPlaying]);


  const handleSkip = (amount: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + amount));
    playerRef.current?.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (val: number[]) => {
    const vol = val[0];
    setVolume(vol);
    playerRef.current?.setVolume(vol * 100);
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    playerRef.current?.setPlaybackRate(s);
    setShowSpeedMenu(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-black rounded-xl overflow-hidden group shadow-2xl">
      
      {/* YouTube iframe container - removed scale-110 zoom */}
      <div className="aspect-video relative overflow-hidden">
        <div 
          id={`yt-player-${videoId}`} 
          className="absolute top-0 left-0 w-full h-full" 
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-white min-w-[40px]">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 0}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1 cursor-pointer"
            />
            <span className="text-xs font-medium text-white min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                onClick={handlePlayPause} 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 rounded-full h-10 w-10"
              >
                {isPlaying ? <Pause className="fill-white" /> : <Play className="fill-white" />}
              </Button>

              <Button 
                onClick={() => handleSkip(-10)} 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 rounded-full"
              >
                <RotateCcw size={20} />
              </Button>

              <Button 
                onClick={() => handleSkip(10)} 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 rounded-full"
              >
                <RotateCw size={20} />
              </Button>

              <div className="flex items-center gap-3 ml-2 group/vol">
                <Volume2 size={18} className="text-white" />
                <Slider 
                  value={[volume]} 
                  min={0} 
                  max={1} 
                  step={0.01} 
                  onValueChange={handleVolumeChange} 
                  className="w-24" 
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Button 
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs font-bold text-white border border-white/30 hover:bg-white/20 h-8"
                >
                  {speed}x
                </Button>
                
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-4 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[80px]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`w-full px-4 py-2 text-xs text-left transition-colors hover:bg-white/10 ${
                          speed === s ? 'bg-white/20 text-blue-400' : 'text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}