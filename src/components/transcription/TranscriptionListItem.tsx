import { useNavigate } from 'react-router-dom';
import { Youtube, Upload, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { Transcript } from '@/lib/api/transcription';
import { TranscriptStatus } from '@/lib/api/transcription';

interface TranscriptionListItemProps {
  transcription: Transcript;
}

const statusConfig: Record<number, { icon: typeof Clock; label: string; className: string }> = {
  [TranscriptStatus.Uploading]: { icon: Clock, label: 'Đang tải lên', className: 'text-muted-foreground' },
  [TranscriptStatus.InQueue]: { icon: Clock, label: 'Đang chờ', className: 'text-warning' },
  [TranscriptStatus.Transcripting]: { icon: Loader2, label: 'Đang xử lý', className: 'text-primary animate-spin' },
  [TranscriptStatus.Finish]: { icon: CheckCircle2, label: 'Hoàn thành', className: 'text-success' },
};

export function TranscriptionListItem({ transcription }: TranscriptionListItemProps) {
  const navigate = useNavigate();
  const status = statusConfig[transcription.status] || statusConfig[TranscriptStatus.Uploading];
  const StatusIcon = status.icon;

  const handleClick = () => {
    if (transcription.status === TranscriptStatus.Finish) {
      navigate(`/transcript/${transcription.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-card border border-border rounded-lg p-3 flex gap-3 transition-colors ${
        transcription.status === TranscriptStatus.Finish ? 'hover:border-primary/30 cursor-pointer' : 'opacity-75'
      }`}
    >
      <div className="w-24 h-16 rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
        {transcription.thumnail_url ? (
          <img src={transcription.thumnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Upload className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{transcription.name}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {transcription.original_source === 'Youtube' ? <Youtube className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
            {transcription.original_source === 'Youtube' ? 'YouTube' : 'Upload'}
          </span>
          <span className="font-mono">{new Date(transcription.date_created).toLocaleDateString()}</span>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${status.className}`}>
        <StatusIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{status.label}</span>
      </div>
    </div>
  );
}
