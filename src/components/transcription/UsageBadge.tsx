import { useEffect, useState } from 'react';
import { getUserUsage } from '@/lib/api/payment';
import type { UserUsage } from '@/lib/api/types';

export function UsageBadge() {
  const [usage, setUsage] = useState<UserUsage | null>(null);

  useEffect(() => {
    getUserUsage().then(setUsage);
  }, []);

  if (!usage) return null;

  const remaining = usage.transcriptionsLimit === -1 ? '∞' : usage.transcriptionsLimit - usage.transcriptionsUsed;
  const isLow = typeof remaining === 'number' && remaining <= 1;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border ${
      isLow ? 'border-warning/30 bg-warning/10 text-warning' : 'border-border bg-card text-muted-foreground'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isLow ? 'bg-warning' : 'bg-success'}`} />
      {remaining} transcriptions remaining · {usage.plan}
    </div>
  );
}
