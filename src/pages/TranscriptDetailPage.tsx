import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTranscription } from '@/lib/api/transcription';
import { TranscriptViewer } from '@/components/transcription/TranscriptViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Youtube, Upload, Share2 } from 'lucide-react';
import type { TranscriptionResponse } from '@/lib/api/types';

export default function TranscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<TranscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getTranscription(id).then(t => { setTranscript(t); setLoading(false); });
    }
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  if (!transcript) return <div className="p-6 text-sm text-destructive">Không tìm thấy bản phiên dịch.</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
      </Button>

      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex items-start gap-4">
          {transcript.thumbnailUrl ? (
            <img src={transcript.thumbnailUrl} alt="" className="w-40 h-24 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-40 h-24 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-xl text-foreground mb-1">{transcript.title}</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {transcript.sourceSite === 'youtube' ? <Youtube className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                {transcript.sourceSite === 'youtube' ? 'YouTube' : 'Upload'}
              </span>
              <span className="font-mono">{new Date(transcript.createdAt).toLocaleString()}</span>
            </div>
            {transcript.videoUrl && (
              <a href={transcript.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block font-mono">
                {transcript.videoUrl}
              </a>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-1 flex-shrink-0">
            <Share2 className="w-3 h-3" /> Chia sẻ
          </Button>
        </div>
      </div>

      {transcript.transcript && <TranscriptViewer transcript={transcript} />}
    </div>
  );
}
