import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  describeTranscriptStatus,
  isTranscriptError,
  isTranscriptReady,
} from '@/lib/api/transcription';

export interface StatusBadgeProps {
  status: number;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation('transcription');
  if (isTranscriptReady(status)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        {describeTranscriptStatus(status)}
      </span>
    );
  }
  if (isTranscriptError(status)) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
        <AlertTriangle className="w-3 h-3" />
        {t('history.statusError')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
      <Clock className="w-3 h-3" />
      {describeTranscriptStatus(status)}
    </span>
  );
}

export default StatusBadge;
