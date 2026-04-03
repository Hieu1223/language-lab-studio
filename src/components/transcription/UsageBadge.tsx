import { useEffect, useState } from 'react';
import { getUserUsage } from '@/lib/api/payment';
import type { UserUsage } from '@/lib/api/types';
import { Zap } from 'lucide-react';

export function UsageBadge() {
  const [usage, setUsage] = useState<UserUsage | null>(null);

  useEffect(() => {
    getUserUsage().then(setUsage);
  }, []);

  if (!usage) return null;

  const isLow = usage.creditsRemaining <= 1;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border ${
      isLow ? 'border-warning/30 bg-warning/10 text-warning' : 'border-border bg-card text-muted-foreground'
    }`}>
      <Zap className={`w-3 h-3 ${isLow ? 'text-warning' : 'text-success'}`} />
      {usage.creditsRemaining} / {usage.dailyCredits} credits · {usage.plan}
      {usage.overageCreditsUsed > 0 && (
        <span className="text-warning ml-1">+{usage.overageCreditsUsed} overage</span>
      )}
    </div>
  );
}
