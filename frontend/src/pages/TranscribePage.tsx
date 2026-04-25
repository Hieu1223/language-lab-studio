import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTranscripts } from '@/lib/api/transcription';
import type { Transcript } from '@/lib/api/transcription';
import { TranscriptStatus } from '@/lib/api/transcription';

const USER_ID = 'current-user';

export default function TranscribePage() {
  const [transcriptions, setTranscriptions] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyTranscripts(USER_ID, { status: 'all', sourceSite: 'all', search: '' }).then(t => { setTranscriptions(t); setLoading(false); });
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="font-display font-bold text-2xl text-foreground mb-1">Các bản phiên dịch</h2>
        <p className="text-sm text-muted-foreground">Xem lại các video đã phiên dịch.</p>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Đang tải...</p> : (
        <div className="space-y-2">
          {transcriptions.map(t => (
            <button key={t.id} onClick={() => navigate(`/transcript/${t.id}`)} className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-xl text-left hover:border-primary/40 transition-colors">
              <div className="w-20 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {t.thumnail_url && <img src={t.thumnail_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{t.name}</h3>
                <p className="text-xs text-muted-foreground">{new Date(t.date_created).toLocaleDateString('vi-VN')}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.status === TranscriptStatus.Finish ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {t.status === TranscriptStatus.Finish ? 'Hoàn thành' : 'Đang xử lý'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
