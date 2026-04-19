import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { toast } from 'sonner';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Play, Loader2 } from 'lucide-react';
import {
  getTranscriptInfo,
  requestTranscription,
  type VideoPreview,
} from '@/lib/api/transcription-real';
import { useAuth } from '@/lib/auth-context';

export default function YouTubeVideoViewerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [video, setVideo] = useState<VideoPreview | null>(() => {
    const stored = sessionStorage.getItem('selectedVideo');
    return stored ? JSON.parse(stored) : null;
  });

  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<'none' | 'checking' | 'found' | 'processing'>('checking');

  // Check if transcript exists
  useEffect(() => {
    if (!videoId) return;

    const checkTranscript = async () => {
      try {
        setChecking(true);
        setTranscriptStatus('checking');
        
        // Try to find existing transcript by video ID
        const info = await getTranscriptInfo(videoId);
        
        if (info) {
          setTranscriptId(info.id);
          setTranscriptStatus('found');
        } else {
          setTranscriptStatus('none');
        }
      } catch (error) {
        setTranscriptStatus('none');
      } finally {
        setChecking(false);
      }
    };

    checkTranscript();
  }, [videoId]);

  const handleRequestTranscription = async () => {
    if (!user || !videoId || !video) {
      toast.error('Missing required information');
      return;
    }

    try {
      setTranscribing(true);
      setTranscriptStatus('processing');

      const result = await requestTranscription(
        `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        video.title,
        video.thumbnail_url || '',
        user.id
      );

      if (result.success) {
        setTranscriptId(result.transcript_id);
        setTranscriptStatus('found');
        
        // Small delay then navigate
        setTimeout(() => {
          navigate(`/transcript/${result.transcript_id}`);
        }, 500);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to request transcription');
      setTranscriptStatus('none');
    } finally {
      setTranscribing(false);
    }
  };

  const handleViewTranscript = () => {
    if (transcriptId) {
      navigate(`/transcript/${transcriptId}`);
    }
  };

  if (!video || !videoId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Button onClick={() => navigate('/youtube')}>Back to Search</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <LoadingScreen
        isOpen={transcribing}
        message="Requesting transcription..."
      />

      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex-1">
          <h1 className="font-bold text-lg text-foreground line-clamp-2">{video.title}</h1>
          <p className="text-sm text-muted-foreground">{video.channel.name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/youtube')}>
          ← Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-4 p-4">
        {/* Video Player */}
        <div className="flex-1 flex flex-col min-w-0 bg-black rounded-lg overflow-hidden">
          <VideoPlayer url={`https://www.youtube.com/embed/${videoId}`} />
        </div>

        {/* Transcript Panel */}
        <div className="w-80 bg-card border border-border rounded-lg p-6 flex flex-col gap-4 flex-shrink-0">
          {checking ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking for transcript...</p>
            </div>
          ) : transcriptStatus === 'found' && transcriptId ? (
            <div className="flex flex-col gap-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  ✓ Transcript Available
                </p>
              </div>
              <Button onClick={handleViewTranscript} size="lg" className="w-full gap-2">
                <Play className="w-4 h-4" />
                View Transcript
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Watch the video and follow along with the transcript on the side.
              </p>
            </div>
          ) : transcriptStatus === 'processing' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing transcript...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  No Transcript Yet
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Request transcription to create a transcript with timestamps and interactive text.
              </p>
              <Button
                onClick={handleRequestTranscription}
                disabled={transcribing}
                size="lg"
                className="w-full gap-2"
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Request Transcription
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This will analyze the video audio and generate a transcript.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
