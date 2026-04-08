import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchYouTubeVideos, getMyTranscripts } from '@/lib/api/transcription';
import type { YouTubeVideo, Transcript } from '@/lib/api/transcription';
import { TranscriptStatus } from '@/lib/api/transcription';
import { Input } from '@/components/ui/input';
import { Search, Check, Video, Filter } from 'lucide-react';

const USER_ID = 'current-user';
type Tab = 'browse' | 'transcribed';

export default function YouTubeBrowsePage() {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('browse');
  const [filter, setFilter] = useState<'all' | 'transcribed' | 'not-transcribed'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      searchYouTubeVideos(USER_ID, query).then(v => { setVideos(v); setLoading(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    getMyTranscripts(USER_ID, { status: 'all', sourceSite: 'all', search: '' }).then(setTranscriptions);
  }, []);

  const filteredVideos = filter === 'all' ? videos :
    filter === 'transcribed' ? videos.filter(v => v.isTranscribed) :
    videos.filter(v => !v.isTranscribed);

  const tabs: { key: Tab; label: string; icon: typeof Video }[] = [
    { key: 'browse', label: 'Duyệt video', icon: Video },
    { key: 'transcribed', label: 'Đã phiên dịch', icon: Check },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Phiên dịch YouTube</h2>
        <p className="text-sm text-muted-foreground">Tìm video, phiên dịch với transcript đồng bộ.</p>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm kiếm video..." className="pl-9 bg-card border-border rounded-xl" />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="text-xs bg-card border border-border rounded-xl px-3 text-foreground">
              <option value="all">Tất cả</option>
              <option value="transcribed">Đã transcript</option>
              <option value="not-transcribed">Chưa transcript</option>
            </select>
          </div>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Đang tải...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVideos.map(video => (
                <button key={video.id} onClick={() => navigate(`/transcribe/${video.id}`)} className="bg-card border border-border rounded-2xl overflow-hidden text-left hover:border-primary/40 transition-all hover:shadow-md group">
                  <div className="relative aspect-video bg-muted">
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 right-2 bg-foreground/80 text-background text-xs px-1.5 py-0.5 rounded font-mono">{video.duration}</span>
                    {video.isTranscribed && (
                      <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">✓ Đã dịch</span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{video.title}</h3>
                    <p className="text-xs text-muted-foreground">{video.channelName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{video.viewCount} lượt xem · {video.publishedAt}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'transcribed' && (
        <div className="space-y-2">
          {transcriptions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">Chưa có video nào được phiên dịch.</p>
          ) : (
            transcriptions.map(t => (
              <button
                key={t.id}
                onClick={() => navigate(`/transcript/${t.id}`)}
                className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl text-left transition-colors hover:border-primary/40 cursor-pointer"
              >
                <div className="w-20 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {t.thumnail_url && <img src={t.thumnail_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.original_source} · {new Date(t.date_created).toLocaleDateString('vi-VN')}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  t.status === TranscriptStatus.Finish ? 'bg-primary/10 text-primary' :
                  t.status === TranscriptStatus.Transcripting ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {t.status === TranscriptStatus.Finish ? 'Hoàn thành' : t.status === TranscriptStatus.Transcripting ? 'Đang xử lý' : 'Chờ'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
