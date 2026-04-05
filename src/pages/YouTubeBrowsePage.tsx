import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchYouTubeVideos, type YouTubeVideo } from '@/lib/api/youtube';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function YouTubeBrowsePage() {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      searchYouTubeVideos(query).then(v => { setVideos(v); setLoading(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Phiên dịch YouTube</h2>
        <p className="text-sm text-muted-foreground">Tìm video và bắt đầu phiên dịch với transcript đồng bộ.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm kiếm video..."
          className="pl-9 bg-card border-border rounded-xl"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map(video => (
            <button
              key={video.id}
              onClick={() => navigate(`/transcribe/${video.id}`)}
              className="bg-card border border-border rounded-2xl overflow-hidden text-left hover:border-primary/40 transition-all hover:shadow-md group"
            >
              <div className="relative aspect-video bg-muted">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 right-2 bg-foreground/80 text-background text-xs px-1.5 py-0.5 rounded font-mono">
                  {video.duration}
                </span>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-muted-foreground">{video.channelName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{video.viewCount} lượt xem · {video.publishedAt}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
