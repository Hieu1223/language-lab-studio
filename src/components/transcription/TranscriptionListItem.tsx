import { useNavigate } from 'react-router-dom';
import { Youtube, Upload, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { TranscriptionResponse } from '@/lib/api/types';

interface TranscriptionListItemProps {
  transcription: TranscriptionResponse;
}

const statusConfig = {
  pending: { icon: Clock, label: 'Đang chờ', className: 'text-warning' },
  processing: { icon: Loader2, label: 'Đang xử lý', className: 'text-primary animate-spin' },
  completed: { icon: CheckCircle2, label: 'Hoàn thành', className: 'text-success' },
  failed: { icon: XCircle, label: 'Lỗi', className: 'text-destructive' },
};

export function TranscriptionListItem({ transcription }: TranscriptionListItemProps) {
  const navigate = useNavigate();
  const status = statusConfig[transcription.status];
  const StatusIcon = status.icon;

  const handleClick = () => {
    if (transcription.status === 'completed') {
      navigate(`/transcript/${transcription.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-card border border-border rounded-lg p-3 flex gap-3 transition-colors ${
        transcription.status === 'completed' ? 'hover:border-primary/30 cursor-pointer' : 'opacity-75'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-24 h-16 rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
        {transcription.thumbnailUrl ? (
          <img src={transcription.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Upload className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{transcription.title}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {transcription.sourceSite === 'youtube' ? <Youtube className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
            {transcription.sourceSite === 'youtube' ? 'YouTube' : 'Upload'}
          </span>
          <span className="font-mono">{new Date(transcription.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${status.className}`}>
        <StatusIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{status.label}</span>
      </div>
    </div>
  );
}
