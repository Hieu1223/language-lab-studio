import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { LoadingScreen } from '@/components/LoadingScreen';
import { toast } from 'sonner';
import { requestTranscription, type VideoPreview } from '@/lib/api/transcription-real';
import { useAuth } from '@/lib/auth-context';

export default function YouTubeVideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [video, setVideo] = useState<VideoPreview | null>(() => {
    const stored = sessionStorage.getItem('selectedVideo');
    return stored ? JSON.parse(stored) : null;
  });

  if (!video || !videoId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Video not found</p>
          <Button onClick={() => navigate('/youtube')}>Back to Search</Button>
        </div>
      </div>
    );
  }

  const handleStartTranscription = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    try {
      setIsTranscribing(true);
      const result = await requestTranscription(
        `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        video.title,
        video.thumbnail_url || '',
        true
      );

      if (result.success) {
        toast.success('Transcription started! Redirecting...');
        setTimeout(() => {
          navigate(`/transcript/${result.transcript_id}`);
        }, 1500);
      } else {
        toast.error('Failed to start transcription');
        setIsTranscribing(false);
      }
    } catch (error) {
      toast.error('Error starting transcription');
      console.error(error);
      setIsTranscribing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <LoadingScreen
        isOpen={isTranscribing}
        message="Transcribing video..."
      />

      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg text-foreground">{video.title}</h1>
          <p className="text-sm text-muted-foreground">
            {video.channel.name}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/youtube')}>
          ← Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Video Player */}
        <div className="flex-1 flex flex-col min-w-0">
          <VideoPlayer url={`https://www.youtube.com/embed/${videoId}`} />
        </div>

        {/* Locked Transcript Panel */}
        <div className="w-80 bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <div className="mb-4 text-3xl">🔒</div>
          <h2 className="font-bold text-lg text-foreground mb-2">Transcript</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Transcription will unlock the subtitle/transcript view so you can see and interact with the video text in real-time.
          </p>

          <Button
            onClick={handleStartTranscription}
            disabled={isTranscribing}
            size="lg"
            className="w-full gap-2"
          >
            {isTranscribing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Đang phiên dịch...
              </>
            ) : (
              'Start Transcription'
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            This will analyze the video and generate a transcript with timestamps.
          </p>
        </div>
      </div>
    </div>
  );
}
