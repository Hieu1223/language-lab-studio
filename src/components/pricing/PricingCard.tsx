import type { PricingPlan } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Sparkles } from 'lucide-react';

interface Props {
  plan: PricingPlan;
  isCurrentPlan: boolean;
  isPopular: boolean;
  subscribing: boolean;
  onSubscribe: () => void;
}

export function PricingCard({ plan, isCurrentPlan, isPopular, subscribing, onSubscribe }: Props) {
  return (
    <div className={`relative bg-card border rounded-xl p-6 flex flex-col ${
      isPopular ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 text-[10px] font-mono uppercase bg-primary text-primary-foreground px-3 py-1 rounded-full">
            <Sparkles className="w-3 h-3" /> Popular
          </span>
        </div>
      )}

      <h3 className="font-display font-bold text-lg text-foreground">{plan.name}</h3>
      <div className="mt-2 mb-4">
        <span className="text-3xl font-bold text-foreground">${plan.price}</span>
        {plan.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        onClick={onSubscribe}
        disabled={isCurrentPlan || subscribing}
        variant={isPopular ? 'default' : 'outline'}
        className="w-full"
      >
        {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> :
         isCurrentPlan ? 'Current Plan' : 'Subscribe'}
      </Button>
    </div>
  );
}
