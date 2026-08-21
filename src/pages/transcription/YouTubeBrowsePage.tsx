import { BookmarkletModal } from '@/components/BookmarkletModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getVisitedVideos,
  parseYouTubeId,
  previewVideo,
  requestTranscription,
  type VisitedVideoResponse as UserHistoryItem,
  type VideoPreview,
} from '@/lib/api/transcription';
import { useAuth } from '@/lib/auth-context';
import { Bookmark, ExternalLink, History, Link2, Loader2, Play } from 'lucide-react';
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

  // History
  const [history, setHistory] = useState<UserHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await getVisitedVideos();
      const list = data?.items ?? [];
      setHistory(
        [...list].sort(
          (a, b) =>
            new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
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

  const handlePreview = useCallback(
    async (raw: string) => {
      if (!raw.trim()) return;
      const videoId = parseYouTubeId(raw);
      if (!videoId) {
        toast.error(t('browse.invalidLink'));
        return;
      }
      try {
        setLoading(true);
        const info = await previewVideo(videoId);
        setVideo(info);
      } catch (err) {
        toast.error(t('browse.previewFailed'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePreview(url);
  };

  const handleTranscribe = async () => {
    if (!video) return;
    if (!user?.id) {
      toast.error(t('browse.loginRequired'));
      return;
    }
    try {
      setTranscribing(true);
      const appVideoId = video.app_video_id ?? video.id;
      await requestTranscription(appVideoId);
      toast.success(t('browse.transcribeStarted'));
      sessionStorage.setItem('selectedVideo', JSON.stringify(video));
      navigate(`/youtube/video/${video.id}`);
    } catch (err) {
      toast.error(t('browse.transcribeFailed'));
      console.error(err);
    } finally {
      setTranscribing(false);
    }
  };

  const handleOpenHistory = (item: UserHistoryItem) => {
    const id = item.resource_id ?? item.video_id;
    navigate(`/youtube/video/${id}`);
  };

  return (
    <>
      {/* Paste link form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              inputMode="url"
              placeholder={t('browse.linkPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || !url.trim()} size="sm">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {tc('actions.loading')}
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                {t('browse.preview')}
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBookmarkletModalOpen(true)}
          >
            <Bookmark className="w-3 h-3" />
          </Button>
        </div>
      </form>

      {/* Detailed video preview */}
      {video && (
        <div className="rounded-xl border bg-card overflow-hidden mb-8 max-w-2xl hover:border-primary/40 transition-colors">
          <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <Play className="w-10 h-10 text-gray-600" />
              </div>
            )}
            {video.duration && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] px-1.5 py-0.5 rounded">
                {video.duration}
              </div>
            )}
          </div>

          <div className="p-3">
            <h2 className="text-lg font-semibold leading-snug line-clamp-2">
              {video.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {video.channel?.name || t('browse.unknownChannel')}
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
              {video.view_count != null && (
                <span>{t('browse.viewCount', { count: video.view_count.toLocaleString() })}</span>
              )}
              {video.channel?.url && (
                <a
                  href={video.channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {t('browse.channelLink')}
                </a>
              )}
            </div>

            {video.description && (
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                {video.description}
              </p>
            )}

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleTranscribe}
                disabled={transcribing}
                className="gap-2"
                size="lg"
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('browse.transcribing')}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {t('browse.transcribe')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
          )}

      {/* History */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <History className="w-4 h-4" />
            {t('browse.history')}
          </h3>
          <Button variant="ghost" size="sm" onClick={loadHistory}>
            {tc('actions.refresh')}
          </Button>
        </div>

        {historyLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <p>{t('history.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((it) => (
              <div
                key={it.video_id}
                className="flex flex-col sm:flex-row gap-3 rounded-xl border bg-card hover:border-primary/40 p-3 transition-colors group"
              >
                <div
                  className="w-full sm:w-44 aspect-video rounded-md overflow-hidden bg-muted shrink-0 cursor-pointer relative"
                  onClick={() => handleOpenHistory(it)}
                >
                  {it.thumbnail_url ? (
                    <img
                      src={it.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                      <Play className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col">
                  <p
                    className="text-sm font-bold leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleOpenHistory(it)}
                  >
                    {it.name ?? it.resource_id ?? it.video_id}
                  </p>
                  {it.updated_at && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(it.updated_at).toLocaleString('vi-VN')}
                    </p>
                  )}

                  <div className="flex gap-1.5 mt-auto pt-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => handleOpenHistory(it)}
                    >
                      <ExternalLink className="w-3 h-3" /> {t('history.open')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookmarkletModal
        isOpen={bookmarkletModalOpen}
        onClose={() => setBookmarkletModalOpen(false)}
      />
    </>
  );
}
