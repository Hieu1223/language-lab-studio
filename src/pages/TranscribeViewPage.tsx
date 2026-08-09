import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getTranscriptionDetail } from '@/lib/api/transcription';

/**
 * Legacy route entrypoint: `/transcript/:id`.
 *
 * Looks up the transcript info to discover the underlying video, then forwards
 * to the unified viewer at `/youtube/video/:videoId` (single source of truth
 * for both "open from history" and "open from browse").
 */
export default function TranscribeViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      navigate('/transcribe', { replace: true });
      return;
    }
    (async () => {
      try {
        const info = await getTranscriptionDetail(id);
        if (cancelled) return;
        if (!info) {
          toast.error('Không tìm thấy bản phiên dịch');
          navigate('/transcribe', { replace: true });
          return;
        }
        const videoId = info.resource_id;
        if (!videoId) {
          toast.error('Bản phiên dịch không gắn với video YouTube');
          navigate('/transcribe', { replace: true });
          return;
        }
        // Carry minimal metadata so the viewer can show a title immediately.
        try {
          sessionStorage.setItem(
            'selectedVideo',
            JSON.stringify({
              id: videoId,
              title: info.original_source,
              thumbnail_url: info.thumnail_url,
              channel: { id: '', name: null, url: null },
              duration: null,
              description: null,
            }),
          );
        } catch {
          /* ignore */
        }
        navigate(`/youtube/video/${videoId}`, { replace: true });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          toast.error('Không tải được bản phiên dịch');
          navigate('/transcribe', { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Đang mở bản phiên dịch...</p>
      </div>
    </div>
  );
}
