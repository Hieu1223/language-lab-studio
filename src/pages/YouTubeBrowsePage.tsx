import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Loader2, Play } from 'lucide-react';
import { requestTranscription, searchYouTube, type VideoPreview } from '@/lib/api/transcription-real';
import { useAuth } from '@/lib/auth-context';

export default function YouTubeBrowsePage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setSearching(true);
      const results = await searchYouTube(query);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No results found');
      }
    } catch (error) {
      toast.error('Failed to search YouTube');
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const handleTranscribe = async (video: VideoPreview) => {
    if (!user) {
      toast.error('You must be logged in to transcribe');
      return;
    }

    try {
      setTranscribing(video.id);
      const result = await requestTranscription(
        `https://www.youtube.com/watch?v=${video.id}`,
        video.id,
        video.title,
        video.thumbnail_url || '',
        true
      );

      if (result.success) {
        toast.success('Transcription started! Please wait...');
        // Navigate to the transcript view
        setTimeout(() => {
          navigate(`/transcript/${result.transcript_id}`);
        }, 1000);
      } else {
        toast.error('Failed to start transcription');
      }
    } catch (error) {
      toast.error('Failed to transcribe video');
      console.error(error);
    } finally {
      setTranscribing(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="font-display font-bold text-2xl text-foreground mb-2">Phiên dịch</h2>
        <p className="text-sm text-muted-foreground">
          Tìm và phiên dịch các video YouTube để ôn tập tiếng Nhật
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Tìm video YouTube..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              disabled={searching}
            />
          </div>
          <Button type="submit" disabled={searching || !query.trim()}>
            {searching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Đang tìm...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Tìm kiếm
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Results Grid */}
      {searchResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Kết quả ({searchResults.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((video) => (
              <Card
                key={video.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <Play className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      onClick={() => handleTranscribe(video)}
                      disabled={transcribing === video.id}
                      className="gap-2"
                    >
                      {transcribing === video.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang phiên dịch...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Phiên dịch
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm line-clamp-2">{video.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {video.channel.name || 'Unknown Channel'}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {video.duration && <p>Duration: {video.duration}</p>}
                    {video.view_count !== null && (
                      <p>Views: {video.view_count.toLocaleString()}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!searching && searchResults.length === 0 && query && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No videos found. Try a different search.</p>
        </div>
      )}

      {!searching && searchResults.length === 0 && !query && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Search for a YouTube video to get started</p>
        </div>
      )}
    </div>
  );
}
