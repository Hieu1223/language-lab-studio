import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchPublicTranscripts } from '@/lib/api/public-transcripts';
import type { PublicTranscript } from '@/lib/api/types';
import { PublicTranscriptCard } from '@/components/public/PublicTranscriptCard';
import { Search, BookOpen, Brain, Video, BookText, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicTranscript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      searchPublicTranscripts(query).then(r => { setResults(r); setLoading(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const features = [
    { icon: Video, title: 'Phiên dịch YouTube', desc: 'Xem video với transcript đồng bộ, cloze test, lặp đoạn' },
    { icon: BookOpen, title: 'Flashcard từ vựng', desc: 'Học từ vựng với spaced repetition theo từ loại' },
    { icon: BookText, title: 'Ngữ pháp JLPT', desc: 'Ôn tập ngữ pháp theo cấp độ N5 đến N1' },
    { icon: Brain, title: 'Luyện dịch câu', desc: 'Dịch Nhật↔Việt với AI kiểm tra và gợi ý' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">日</span>
            </div>
            <h1 className="font-display font-bold text-lg text-foreground">NihonGo</h1>
          </div>
          <Link to="/login">
            <Button size="sm" className="font-bold rounded-xl">Đăng nhập</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 text-center">
        <h2 className="font-display font-extrabold text-4xl md:text-5xl text-foreground mb-4">
          Học tiếng Nhật <span className="text-primary">thông minh hơn</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
          Phiên dịch video, flashcard, ngữ pháp và luyện tập — tất cả trong một nền tảng.
        </p>
        <Link to="/login">
          <Button size="lg" className="font-bold rounded-xl gap-2 text-base px-8">
            Bắt đầu miễn phí <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {features.map(f => (
            <div key={f.title} className="bg-card border border-border rounded-2xl p-5 text-center hover:border-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Public transcripts */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h3 className="font-display font-bold text-xl text-foreground mb-4">Transcript công khai</h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm kiếm transcript..."
            className="pl-9 bg-card border-border rounded-xl"
          />
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Đang tải...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Không tìm thấy transcript.</div>
        ) : (
          <div className="space-y-3">
            {results.map(t => <PublicTranscriptCard key={t.id} transcript={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}
