import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  url: string;
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export function VideoPlayer({
  url,
  onTimeUpdate,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [skipDuration, setSkipDuration] = useState(5);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSkipMenu, setShowSkipMenu] = useState(false);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        onPause?.();
      } else {
        videoRef.current.play();
        onPlay?.();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - skipDuration);
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        duration,
        videoRef.current.currentTime + skipDuration
      );
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
    setShowSpeedMenu(false);
  };

  const handleTimelineChange = (newTime: number[]) => {
    const time = newTime[0];
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, time));
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate]);

  return (
    <div className="bg-black rounded-lg overflow-hidden flex flex-col">
      {/* Video */}
      <video
        ref={videoRef}
        src={url}
        className="w-full bg-black"
        onPlay={() => {
          setIsPlaying(true);
          onPlay?.();
        }}
        onPause={() => {
          setIsPlaying(false);
          onPause?.();
        }}
      />

      {/* Controls */}
      <div className="bg-gray-900 p-4 text-white space-y-3">
        {/* Timeline */}
        <div className="flex items-center gap-2">
          <span className="text-xs whitespace-nowrap">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 0}
            step={0.1}
            onValueChange={handleTimelineChange}
            className="flex-1"
          />
          <span className="text-xs whitespace-nowrap">{formatTime(duration)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              onClick={handlePlayPause}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            {/* Skip Backward */}
            <Button
              onClick={handleSkipBackward}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 text-xs"
            >
              -{skipDuration}s
            </Button>

            {/* Skip Duration Settings */}
            <div className="relative">
              <Button
                onClick={() => setShowSkipMenu(!showSkipMenu)}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 text-xs"
              >
                {skipDuration}s
              </Button>
              {showSkipMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-50">
                  {[5, 10, 15, 30].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => {
                        setSkipDuration(dur);
                        setShowSkipMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-sm text-white hover:bg-gray-700 text-left"
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Skip Forward */}
            <Button
              onClick={handleSkipForward}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 text-xs"
            >
              +{skipDuration}s
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Volume */}
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1">
              <Volume2 className="w-4 h-4" />
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            {/* Speed */}
            <div className="relative">
              <Button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 text-xs"
              >
                {speed}x
              </Button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-50">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`w-full px-3 py-1.5 text-sm text-left ${
                        speed === s ? 'bg-primary text-white' : 'text-white hover:bg-gray-700'
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
  );
}
