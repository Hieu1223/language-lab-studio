import { BookmarkletModal } from '@/components/BookmarkletModal';
import { StatusBadge } from '@/components/transcription/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getVisitedVideos,
  isTranscriptError,
  isTranscriptReady,
  parseYouTubeId,
  previewVideo,
  requestTranscription,
  type VisitedVideoResponse as HistoryItem,
  type VideoPreview,
} from '@/lib/api/transcription';
import { useAuth } from '@/lib/auth-context';
import { Bookmark, ExternalLink, History, Link2, Loader2, Play, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function YouTubeBrowsePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation('transcription');
  const { t: tc } = useTranslation('common');

  const [url, setUrl] = useState('');
  const [video, setVideo] = useState<VideoPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [bookmarkletModalOpen, setBookmarkletModalOpen] = useState(false);

  // History - using visited videos instead of transcription history
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<HistoryItem | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await getVisitedVideos();
      const list = data?.items ?? [];
      setHistory(
        [...list].sort(
          (a, b) =>
            new Date(b.updated_at ?? '').getTime() - 
            new Date(a.updated_at ?? '').getTime(),
        ),
      );
    } catch {
      toast.error(t('history.loadFailed'));
    } finally {
      setHistoryLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleUrlSubmit = async () => {
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      toast.error(t('errors.invalidUrl'));
      return;
    }
    setLoading(true);
    setVideo(null);
    try {
      const info = await previewVideo(videoId);
      setVideo(info);
    } catch {
      toast.error(t('errors.previewFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!video) return;
    setTranscribing(true);
    try {
      await requestTranscription(video.id);
      toast.success(t('transcription.started'));
      navigate(`/youtube/video/${video.id}`);
    } catch {
      toast.error(t('transcription.failed'));
    } finally {
      setTranscribing(false);
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    // Navigate to the video page which will handle finding/creating transcript
    navigate(`/youtube/video/${item.video_id}`);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    // The API doesn't support deleting visited videos directly
    toast.error(t('history.deleteNotSupported'));
    setConfirmDelete(null);
  };

  return (
    <>
      <div className="container mx-auto max-w-5xl space-y-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('browse.title')}</h1>
          <Button variant="outline" onClick={() => setBookmarkletModalOpen(true)}>
            <Bookmark className="w-4 h-4 mr-2" />
            {t('browse.bookmarklet')}
          </Button>
        </div>

        {/* URL Input */}
        <div className="flex gap-2">
          <Input
            placeholder={t('browse.urlPlaceholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button onClick={handleUrlSubmit} disabled={loading || transcribing}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Video Preview */}
        {video && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex gap-4">
              {video.thumbnail_url && (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-40 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">{video.title}</h2>
                {video.channel?.name && (
                  <p className="text-sm text-muted-foreground">{video.channel.name}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleTranscribe} disabled={transcribing}>
                    {transcribing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {t('browse.transcribe')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/youtube/video/${video.id}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('browse.view')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{t('history.title')}</h2>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">{t('history.empty')}</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.video_id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleHistoryClick(item)}
                >
                  {item.thumbnail_url && (
                    <img
                      src={item.thumbnail_url}
                      alt={item.name}
                      className="w-24 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.updated_at ?? '').toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={null} done={false} msg="" />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(item);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold">{t('history.confirmDelete')}</h3>
            <p className="text-sm text-muted-foreground">{confirmDelete.name}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                {tc('cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {tc('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BookmarkletModal open={bookmarkletModalOpen} onOpenChange={setBookmarkletModalOpen} />
    </>
  );
}
